package com.dbvcs.validation;

import java.lang.annotation.Annotation;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Fluent registry for typed annotation validation rules.
 *
 * <p>Declare a bean of this type in your Spring application configuration to
 * control which annotations are mandatory on which entities — using real
 * {@code Class} references instead of error-prone strings in properties.
 *
 * <p>When a {@code ValidationRuleRegistry} bean is present it takes full
 * priority over any {@code dbvcs.validation.*} properties. The properties
 * remain as a fallback when no bean is defined.
 *
 * <h3>Example</h3>
 * <pre>{@code
 * @Configuration
 * public class DbvcsValidationConfig {
 *
 *     @Bean
 *     public ValidationRuleRegistry dbvcsValidationRules() {
 *         return ValidationRuleRegistry.create()
 *             .failOnViolation()
 *
 *             // Every entity must have these
 *             .forAll(Domain.class, BusinessModule.class, DataClassification.class, Lifecycle.class)
 *
 *             // Auth entities additionally need these
 *             .forPackage("com.example.entity.auth.**",
 *                         LawfulBasis.class, Pii.class, DataRetention.class)
 *
 *             // One specific entity has extra requirements
 *             .forEntity(CustomerOrder.class,
 *                         Purpose.class, Criticality.class);
 *     }
 * }
 * }</pre>
 *
 * <h3>Rule resolution order</h3>
 * <ol>
 *   <li>Global rules ({@link #forAll}) always apply to every entity.</li>
 *   <li>Package rules ({@link #forPackage}) are checked in declaration order;
 *       the first matching rule is merged with the global set.</li>
 *   <li>Entity rules ({@link #forEntity}) are exact-class matches and are
 *       also merged with the global set.</li>
 * </ol>
 */
public final class ValidationRuleRegistry {

    private boolean failOnViolation = false;
    private final List<ValidationRule> rules = new ArrayList<>();

    private ValidationRuleRegistry() {}

    /** Start building a new registry. */
    public static ValidationRuleRegistry create() {
        return new ValidationRuleRegistry();
    }

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    /**
     * Abort application startup when violations are found.
     * Default is warn-only (mirrors {@code dbvcs.validation.fail-on-violation=false}).
     */
    public ValidationRuleRegistry failOnViolation() {
        this.failOnViolation = true;
        return this;
    }

    /**
     * Warn on violations but allow startup to continue.
     * This is the default — call this explicitly only for clarity.
     */
    public ValidationRuleRegistry warnOnViolation() {
        this.failOnViolation = false;
        return this;
    }

    // -------------------------------------------------------------------------
    // Rule registration
    // -------------------------------------------------------------------------

    /**
     * Require these annotations on <em>every</em> scanned {@code @Entity}.
     *
     * <p>Multiple calls are additive — all listed annotations across all
     * {@code forAll()} calls are required globally.
     */
    @SafeVarargs
    public final ValidationRuleRegistry forAll(Class<? extends Annotation>... annotations) {
        rules.add(ValidationRule.global(annotations));
        return this;
    }

    /**
     * Require additional annotations on entities whose package matches {@code pattern}.
     *
     * <ul>
     *   <li>{@code com.example.entity.*}  — direct package only</li>
     *   <li>{@code com.example.entity.**} — package and all sub-packages</li>
     *   <li>{@code com.example.entity}    — exact package name</li>
     * </ul>
     *
     * <p>The first matching package rule wins; its annotations are merged
     * with the global set from {@link #forAll}.
     */
    @SafeVarargs
    public final ValidationRuleRegistry forPackage(String pattern,
                                                    Class<? extends Annotation>... annotations) {
        rules.add(ValidationRule.forPackage(pattern, annotations));
        return this;
    }

    /**
     * Require additional annotations on one specific entity class.
     *
     * <p>Entity rules are checked after package rules; they are merged with
     * the global set and any matching package rule.
     */
    @SafeVarargs
    public final ValidationRuleRegistry forEntity(Class<?> entityClass,
                                                   Class<? extends Annotation>... annotations) {
        rules.add(ValidationRule.forEntity(entityClass, annotations));
        return this;
    }

    // -------------------------------------------------------------------------
    // Accessors (used by EntityAnnotationValidator)
    // -------------------------------------------------------------------------

    public boolean isFailOnViolation() {
        return failOnViolation;
    }

    public List<ValidationRule> getRules() {
        return Collections.unmodifiableList(rules);
    }
}
