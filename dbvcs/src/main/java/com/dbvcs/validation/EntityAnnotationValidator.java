package com.dbvcs.validation;

import com.dbvcs.annotation.EntityMetadata;
import com.dbvcs.annotation.FieldMetadata;
import com.dbvcs.autoconfigure.DbvcsProperties;
import com.dbvcs.scanner.ClasspathEntityFinder;
import jakarta.persistence.Entity;

import java.lang.annotation.Annotation;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.*;
import java.util.Arrays;

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
            DbvcsProperties.Validation validation = properties.getValidation();
            enabled = validation.isEnabled();
            failOnViolation = validation.isFailOnViolation();
        }

        if (!enabled) {
            return;
        }

        // Get packages to scan
        String packagesStr = properties.getScanning().getPackages();
        
        Set<String> classNames = finder.findClassNames(packagesStr, classLoader);
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
                    : List.of();

            if (required.isEmpty()) {
                continue;
            }

            List<String> missing = findMissingAnnotations(clazz, required);
            List<FieldViolationReport> fieldViolations = checkAttributeRequirements(clazz);

            if (!missing.isEmpty() || !fieldViolations.isEmpty()) {
                violations.add(new ViolationReport(clazz.getName(), missing, fieldViolations));
            }
        }

        if (violations.isEmpty()) {
            System.out.println("[dbvcs] ✓ Annotation validation passed. All entities comply.");
            return;
        }

        String report = buildReport(violations, failOnViolation);

        if (failOnViolation) {
            throw new EntityAnnotationViolationException(report);
        } else {
            System.out.println(report);
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
        
        if (failOnViolation) {
            sb.append("[dbvcs] ANNOTATION VALIDATION FAILED (rules via: ").append(mode).append(")\n");
        } else {
            sb.append("[dbvcs] ANNOTATION VALIDATION WARNING (rules via: ").append(mode).append(")\n");
        }
        
        sb.append("[dbvcs] ").append(violations.size())
          .append(violations.size() == 1 ? " entity" : " entities")
          .append(" missing required annotations:\n");
        sb.append("[dbvcs] ─────────────────────────────────────────────────────\n");

        for (ViolationReport v : violations) {
            sb.append("[dbvcs]  ✗ ").append(v.className()).append("\n");
            
            // Entity-level missing annotations
            for (String ann : v.missingAnnotations()) {
                sb.append("[dbvcs]      missing: @").append(ann).append("\n");
            }
            
            // Field-level missing annotations
            if (v.fieldViolations() != null && !v.fieldViolations().isEmpty()) {
                for (FieldViolationReport fv : v.fieldViolations()) {
                    if ("<entity>".equals(fv.fieldName())) {
                        sb.append("[dbvcs]      @EntityMetadata missing required attributes:\n");
                    } else {
                        sb.append("[dbvcs]      field '").append(fv.fieldName()).append("' @FieldMetadata missing required attributes:\n");
                    }
                    for (String ann : fv.missingAnnotations()) {
                        sb.append("[dbvcs]        missing attribute: ").append(ann).append("\n");
                    }
                }
            }
        }

        sb.append("[dbvcs] ─────────────────────────────────────────────────────\n");

        if (!failOnViolation) {
            sb.append("[dbvcs] Continuing execution with warnings (fail-on-violation=false).\n");
            sb.append("[dbvcs] To make this a startup error, set dbvcs.validation.fail-on-violation=true.\n");
        }

        return sb.toString();
    }

    // -------------------------------------------------------------------------
    // Attribute-level validation
    // -------------------------------------------------------------------------

    /**
     * Checks that required @EntityMetadata and @FieldMetadata attributes are non-empty.
     * Merges global attribute rules with any scoped rules matching this class.
     */
    private List<FieldViolationReport> checkAttributeRequirements(Class<?> clazz) {
        List<FieldViolationReport> violations = new ArrayList<>();

        List<String> requiredEntityAttrs = resolveRequiredEntityAttributes(clazz);
        List<String> requiredFieldAttrs  = resolveRequiredFieldAttributes(clazz);

        // Check entity-level @EntityMetadata attributes
        if (!requiredEntityAttrs.isEmpty()) {
            EntityMetadata entityMeta = clazz.getAnnotation(EntityMetadata.class);
            if (entityMeta != null) {
                List<String> missing = checkAnnotationAttributes(entityMeta, requiredEntityAttrs);
                if (!missing.isEmpty()) {
                    violations.add(new FieldViolationReport("<entity>", missing));
                }
            }
        }

        // Check field-level @FieldMetadata attributes
        if (!requiredFieldAttrs.isEmpty()) {
            for (Field field : clazz.getDeclaredFields()) {
                FieldMetadata fieldMeta = field.getAnnotation(FieldMetadata.class);
                if (fieldMeta == null) continue;
                List<String> missing = checkAnnotationAttributes(fieldMeta, requiredFieldAttrs);
                if (!missing.isEmpty()) {
                    violations.add(new FieldViolationReport(field.getName(), missing));
                }
            }
        }

        return violations;
    }

    private List<String> resolveRequiredEntityAttributes(Class<?> clazz) {
        if (registry != null) {
            return resolveAttributesFromRules(clazz, false);
        }
        String csv = properties.getValidation().getEntity().getRequiredAttributes();
        return parseCommaSeparated(csv);
    }

    private List<String> resolveRequiredFieldAttributes(Class<?> clazz) {
        if (registry != null) {
            return resolveAttributesFromRules(clazz, true);
        }
        String csv = properties.getValidation().getField().getRequiredAttributes();
        return parseCommaSeparated(csv);
    }

    /** Merges global + first matching scoped AttributeRule for this class. */
    private List<String> resolveAttributesFromRules(Class<?> clazz, boolean forFields) {
        Set<String> merged = new LinkedHashSet<>();
        String packageName = clazz.getPackageName();
        String className   = clazz.getName();
        boolean scopedMatched = false;

        for (ValidationRule.AttributeRule rule : registry.getAttributeRules()) {
            if (rule.isForFields() != forFields) continue;
            if (rule.isGlobal()) {
                merged.addAll(rule.getAttributes());
            } else if (!scopedMatched && matchesPackagePattern(packageName, className, rule.getScope())) {
                merged.addAll(rule.getAttributes());
                scopedMatched = true;
            }
        }
        return new ArrayList<>(merged);
    }

    /** Checks that the listed attribute names on an annotation are non-blank/non-false. */
    private List<String> checkAnnotationAttributes(Annotation annotation, List<String> requiredAttrs) {
        List<String> missing = new ArrayList<>();
        for (String attr : requiredAttrs) {
            try {
                Method m = annotation.annotationType().getDeclaredMethod(attr);
                Object value = m.invoke(annotation);
                if (value == null || value.toString().isBlank() || "false".equals(value.toString())) {
                    missing.add(attr);
                }
            } catch (NoSuchMethodException e) {
                // Attribute doesn't exist on this annotation — skip silently
            } catch (InvocationTargetException | IllegalAccessException e) {
                missing.add(attr + "(error reading)");
            }
        }
        return missing;
    }

    private List<String> parseCommaSeparated(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(s -> s.trim())
                .filter(s -> !s.isEmpty())
                .toList();
    }

    // -------------------------------------------------------------------------
    // Inner types
    // -------------------------------------------------------------------------

    private record ViolationReport(String className, List<String> missingAnnotations, List<FieldViolationReport> fieldViolations) {}
    
    private record FieldViolationReport(String fieldName, List<String> missingAnnotations) {}
}
