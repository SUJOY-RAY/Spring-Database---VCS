package com.dbvcs.validation;

import com.dbvcs.autoconfigure.DbvcsProperties;
import com.dbvcs.autoconfigure.DbvcsProperties.ValidationRules.PackageRule;
import com.dbvcs.scanner.ClasspathEntityFinder;
import jakarta.persistence.Entity;

import java.lang.annotation.Annotation;
import java.util.*;

/**
 * Runtime validator that checks all {@code @Entity} classes against configurable
 * annotation requirements.
 *
 * <h3>Two configuration modes</h3>
 * <ol>
 *   <li><b>Registry bean (recommended)</b> — define a {@link ValidationRuleRegistry}
 *       bean in your application. Gives compile-time safety via real
 *       {@code Class<? extends Annotation>} references and full IDE support.</li>
 *   <li><b>Properties fallback</b> — when no registry bean is present, rules
 *       are read from {@code dbvcs.validation.*} in {@code application.properties}.</li>
 * </ol>
 *
 * <p>The registry always takes full priority over properties when both are present.
 */
public class EntityAnnotationValidator {

    private final DbvcsProperties properties;
    private final ClasspathEntityFinder finder;

    /**
     * Injected by the auto-configuration when a {@link ValidationRuleRegistry}
     * bean is present in the application context. {@code null} means fall back
     * to properties-based config.
     */
    private ValidationRuleRegistry registry;

    public EntityAnnotationValidator(DbvcsProperties properties) {
        this.properties = properties;
        this.finder = new ClasspathEntityFinder();
    }

    /** Called by the auto-configuration when a registry bean is detected. */
    public void setRegistry(ValidationRuleRegistry registry) {
        this.registry = registry;
    }

    // -------------------------------------------------------------------------
    // Validation entry point
    // -------------------------------------------------------------------------

    /**
     * Scans all entity classes and validates annotation requirements.
     *
     * @param classLoader the classloader to use for scanning
     * @throws EntityAnnotationViolationException if violations are found and
     *         fail-on-violation is configured
     */
    public void validate(ClassLoader classLoader) {
        // Resolve effective mode: registry bean takes priority over properties
        boolean enabled;
        boolean failOnViolation;

        if (registry != null) {
            // Registry bean present — always enabled, respects its own failOnViolation flag
            enabled = true;
            failOnViolation = registry.isFailOnViolation();
        } else {
            DbvcsProperties.ValidationRules rules = properties.getValidation();
            enabled = rules.isEnabled();
            failOnViolation = rules.isFailOnViolation();
        }

        if (!enabled) {
            return;
        }

        Set<String> classNames = finder.findClassNames(properties.getBasePackages(), classLoader);
        List<ViolationReport> violations = new ArrayList<>();

        for (String className : classNames) {
            Class<?> clazz;
            try {
                clazz = classLoader.loadClass(className);
            } catch (Throwable ignored) {
                continue;
            }

            if (!clazz.isAnnotationPresent(Entity.class)) {
                continue;
            }

            List<String> required = registry != null
                    ? resolveFromRegistry(clazz)
                    : resolveFromProperties(clazz);

            if (required.isEmpty()) {
                continue;
            }

            List<String> missing = findMissingAnnotations(clazz, required);
            if (!missing.isEmpty()) {
                violations.add(new ViolationReport(clazz.getName(), missing));
            }
        }

        if (violations.isEmpty()) {
            System.out.println("[dbvcs] Annotation validation passed. All entities comply.");
            return;
        }

        String report = buildReport(violations, failOnViolation);

        if (failOnViolation) {
            throw new EntityAnnotationViolationException(report);
        } else {
            System.err.println(report);
        }
    }

    // -------------------------------------------------------------------------
    // Resolution: registry-based (typed)
    // -------------------------------------------------------------------------

    private List<String> resolveFromRegistry(Class<?> clazz) {
        Set<String> required = new LinkedHashSet<>();
        String packageName = clazz.getPackageName();
        String className   = clazz.getName();

        boolean packageRuleMatched = false;

        for (ValidationRule rule : registry.getRules()) {
            if (rule.isGlobal()) {
                // Global rules always contribute
                rule.getRequired().forEach(a -> required.add(a.getSimpleName()));
            } else if (!packageRuleMatched
                    && matchesPackagePattern(packageName, className, rule.getPackagePattern())) {
                // First matching package/entity rule wins
                rule.getRequired().forEach(a -> required.add(a.getSimpleName()));
                packageRuleMatched = true;
            } else if (className.equals(rule.getPackagePattern())) {
                // Exact entity rule — always merged regardless of package match
                rule.getRequired().forEach(a -> required.add(a.getSimpleName()));
            }
        }

        return new ArrayList<>(required);
    }

    // -------------------------------------------------------------------------
    // Resolution: properties-based (string names)
    // -------------------------------------------------------------------------

    private List<String> resolveFromProperties(Class<?> clazz) {
        DbvcsProperties.ValidationRules rules = properties.getValidation();
        String packageName = clazz.getPackageName();
        String className   = clazz.getName();

        Set<String> required = new LinkedHashSet<>(rules.getRequiredAnnotations());

        for (PackageRule rule : rules.getRules()) {
            if (matchesPackagePattern(packageName, className, rule.getPackagePattern())) {
                required.addAll(rule.getRequiredAnnotations());
                break; // first matching rule wins
            }
        }

        return new ArrayList<>(required);
    }

    // -------------------------------------------------------------------------
    // Annotation presence check
    // -------------------------------------------------------------------------

    private List<String> findMissingAnnotations(Class<?> clazz, List<String> requiredNames) {
        Set<String> present = new HashSet<>();
        for (Annotation ann : clazz.getAnnotations()) {
            Class<? extends Annotation> type = ann.annotationType();
            present.add(type.getSimpleName());
            present.add(type.getName());
        }

        List<String> missing = new ArrayList<>();
        for (String required : requiredNames) {
            if (!present.contains(required)) {
                missing.add(required);
            }
        }
        return missing;
    }

    // -------------------------------------------------------------------------
    // Package pattern matching
    // -------------------------------------------------------------------------

    /**
     * <ul>
     *   <li>{@code com.example.**} — package and all sub-packages (recursive)</li>
     *   <li>{@code com.example.*}  — direct package only (single level)</li>
     *   <li>No wildcard            — exact package or exact class name</li>
     * </ul>
     */
    private boolean matchesPackagePattern(String packageName, String className, String pattern) {
        if (pattern == null || pattern.isBlank()) return false;

        if (pattern.endsWith(".**")) {
            String base = pattern.substring(0, pattern.length() - 3);
            return packageName.equals(base) || packageName.startsWith(base + ".");
        }
        if (pattern.endsWith(".*")) {
            String base = pattern.substring(0, pattern.length() - 2);
            return packageName.equals(base);
        }
        return packageName.equals(pattern) || className.equals(pattern);
    }

    // -------------------------------------------------------------------------
    // Report builder
    // -------------------------------------------------------------------------

    private String buildReport(List<ViolationReport> violations, boolean failOnViolation) {
        String mode = registry != null ? "registry bean" : "application.properties";
        StringBuilder sb = new StringBuilder();
        sb.append("\n[dbvcs] ─────────────────────────────────────────────────────\n");
        sb.append("[dbvcs] ANNOTATION VALIDATION FAILED (rules via: ").append(mode).append(")\n");
        sb.append("[dbvcs] ").append(violations.size())
          .append(violations.size() == 1 ? " entity" : " entities")
          .append(" missing required annotations:\n");
        sb.append("[dbvcs] ─────────────────────────────────────────────────────\n");

        for (ViolationReport v : violations) {
            sb.append("[dbvcs]  ✗ ").append(v.className()).append("\n");
            for (String ann : v.missingAnnotations()) {
                sb.append("[dbvcs]      missing: @").append(ann).append("\n");
            }
        }

        sb.append("[dbvcs] ─────────────────────────────────────────────────────\n");

        if (!failOnViolation) {
            sb.append("[dbvcs] To make this a startup error call .failOnViolation() on the registry,\n");
            sb.append("[dbvcs] or set dbvcs.validation.fail-on-violation=true in application.properties.\n");
        }

        return sb.toString();
    }

    // -------------------------------------------------------------------------
    // Inner types
    // -------------------------------------------------------------------------

    private record ViolationReport(String className, List<String> missingAnnotations) {}
}
