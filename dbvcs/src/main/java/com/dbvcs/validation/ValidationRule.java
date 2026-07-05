package com.dbvcs.validation;

import java.lang.annotation.Annotation;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * A single typed validation rule that maps a package pattern to a set of
 * required annotations, expressed as actual {@code Class} references rather
 * than strings.
 *
 * <p>Build rules via the fluent factory methods and register them in a
 * {@link ValidationRuleRegistry} bean in your application:
 *
 * <pre>{@code
 * @Bean
 * public ValidationRuleRegistry dbvcsValidationRules() {
 *     return ValidationRuleRegistry.create()
 *         .failOnViolation()
 *         .forAll(Domain.class, BusinessModule.class, DataClassification.class)
 *         .forPackage("com.example.entity.auth.**",
 *                     Domain.class, DataClassification.class, Pii.class, LawfulBasis.class)
 *         .forEntity(CustomerOrder.class,
 *                     Domain.class, Lifecycle.class, DataRetention.class);
 * }
 * }</pre>
 */
public final class ValidationRule {

    /**
     * Sentinel package pattern meaning "applies to every scanned entity".
     */
    static final String GLOBAL = "__GLOBAL__";

    private final String packagePattern;
    private final List<Class<? extends Annotation>> required;

    private ValidationRule(String packagePattern, List<Class<? extends Annotation>> required) {
        this.packagePattern = packagePattern;
        this.required = List.copyOf(required);
    }

    // -------------------------------------------------------------------------
    // Factory helpers (used by ValidationRuleRegistry)
    // -------------------------------------------------------------------------

    /** Creates a global rule that applies to all entities. */
    @SafeVarargs
    static ValidationRule global(Class<? extends Annotation>... annotations) {
        return new ValidationRule(GLOBAL, Arrays.asList(annotations));
    }

    /** Creates a rule scoped to a package pattern. */
    @SafeVarargs
    static ValidationRule forPackage(String pattern, Class<? extends Annotation>... annotations) {
        return new ValidationRule(pattern, Arrays.asList(annotations));
    }

    /** Creates a rule scoped to a single entity class. */
    @SafeVarargs
    static ValidationRule forEntity(Class<?> entityClass, Class<? extends Annotation>... annotations) {
        return new ValidationRule(entityClass.getName(), Arrays.asList(annotations));
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    public String getPackagePattern() {
        return packagePattern;
    }

    public List<Class<? extends Annotation>> getRequired() {
        return required;
    }

    public boolean isGlobal() {
        return GLOBAL.equals(packagePattern);
    }
}
