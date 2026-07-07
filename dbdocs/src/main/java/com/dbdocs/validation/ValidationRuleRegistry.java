package com.dbdocs.validation;

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
 * priority over any {@code dbdocs.validation.*} properties. The properties
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

    /** Required @EntityMetadata attribute names (non-empty check). */
    private final List<String> requiredEntityAttributes = new ArrayList<>();

    /** Required @FieldMetadata attribute names (non-empty check). */
    private final List<String> requiredFieldAttributes = new ArrayList<>();

    /** Scoped attribute rules — per package/entity. */
    private final List<ValidationRule.AttributeRule> attributeRules = new ArrayList<>();
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
     * Default is warn-only (mirrors {@code dbdocs.validation.fail-on-violation=false}).
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
    // Attribute-level requirements
    // -------------------------------------------------------------------------

    /**
     * Require that the listed {@code @EntityMetadata} attributes are non-empty on <em>every</em> entity.
     * <p>Multiple calls are additive.
     */
    public ValidationRuleRegistry requireEntityAttributes(String... attributes) {
        requiredEntityAttributes.addAll(List.of(attributes));
        attributeRules.add(new ValidationRule.AttributeRule(
                ValidationRule.AttributeRule.GLOBAL, false, List.of(attributes)));
        return this;
    }

    /**
     * Require that the listed {@code @EntityMetadata} attributes are non-empty on entities
     * whose package matches {@code pattern} (supports {@code *} and {@code **} wildcards)
     * or whose class name matches exactly.
     * <p>Use {@link EntityAttributes} constants for the attribute names.
     */
    public ValidationRuleRegistry requireEntityAttributesFor(String pattern, String... attributes) {
        attributeRules.add(new ValidationRule.AttributeRule(pattern, false, List.of(attributes)));
        return this;
    }

    /**
     * Require that the listed {@code @EntityMetadata} attributes are non-empty on a specific entity class.
     * <p>Use {@link EntityAttributes} constants for the attribute names.
     */
    public ValidationRuleRegistry requireEntityAttributesFor(Class<?> entityClass, String... attributes) {
        attributeRules.add(new ValidationRule.AttributeRule(entityClass.getName(), false, List.of(attributes)));
        return this;
    }

    /**
     * Require that the listed {@code @FieldMetadata} attributes are non-empty on every field
     * that carries {@code @FieldMetadata}, across all entities.
     * <p>Multiple calls are additive.
     */
    public ValidationRuleRegistry requireFieldAttributes(String... attributes) {
        requiredFieldAttributes.addAll(List.of(attributes));
        attributeRules.add(new ValidationRule.AttributeRule(
                ValidationRule.AttributeRule.GLOBAL, true, List.of(attributes)));
        return this;
    }

    /**
     * Require that the listed {@code @FieldMetadata} attributes are non-empty on fields
     * of entities whose package matches {@code pattern} or whose class name matches exactly.
     * <p>Use {@link FieldAttributes} constants for the attribute names.
     */
    public ValidationRuleRegistry requireFieldAttributesFor(String pattern, String... attributes) {
        attributeRules.add(new ValidationRule.AttributeRule(pattern, true, List.of(attributes)));
        return this;
    }

    /**
     * Require that the listed {@code @FieldMetadata} attributes are non-empty on fields
     * of a specific entity class.
     * <p>Use {@link FieldAttributes} constants for the attribute names.
     */
    public ValidationRuleRegistry requireFieldAttributesFor(Class<?> entityClass, String... attributes) {
        attributeRules.add(new ValidationRule.AttributeRule(entityClass.getName(), true, List.of(attributes)));
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

    public List<String> getRequiredEntityAttributes() {
        return Collections.unmodifiableList(requiredEntityAttributes);
    }

    public List<String> getRequiredFieldAttributes() {
        return Collections.unmodifiableList(requiredFieldAttributes);
    }

    public List<ValidationRule.AttributeRule> getAttributeRules() {
        return Collections.unmodifiableList(attributeRules);
    }
}
