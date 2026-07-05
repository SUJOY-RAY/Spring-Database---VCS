package com.spring.mockspring.config;

import com.dbvcs.annotation.*;
import com.dbvcs.validation.ValidationRuleRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Typed validation rules for entity annotations.
 *
 * <p>Defining a {@link ValidationRuleRegistry} bean takes full priority over any
 * {@code dbvcs.validation.*} properties. Use this approach for compile-time safety,
 * IDE autocomplete, and refactoring support.
 *
 * <h3>How to customize</h3>
 * <ul>
 *   <li><b>{@code .forAll(...)}</b> — annotations required on every entity</li>
 *   <li><b>{@code .forPackage(...)}</b> — annotations required on a package or sub-tree</li>
 *   <li><b>{@code .forEntity(...)}</b> — annotations required on a specific entity class</li>
 *   <li><b>{@code .failOnViolation()}</b> — abort startup if violations found</li>
 *   <li><b>{@code .warnOnViolation()}</b> — log warnings only (default)</li>
 * </ul>
 *
 * <h3>Examples</h3>
 * <pre>{@code
 * // Require fewer annotations globally
 * .forAll(Domain.class, DataClassification.class)
 *
 * // Add stricter rules for auth entities
 * .forPackage("com.spring.mockspring.entity.auth.**",
 *             Pii.class, LawfulBasis.class, Encrypted.class)
 *
 * // Require extra annotations on one specific entity
 * .forEntity(User.class,
 *            Purpose.class, Criticality.class)
 * }</pre>
 */
@Configuration
public class DbvcsValidationConfig {

    @Bean
    public ValidationRuleRegistry dbvcsValidationRules() {
        return ValidationRuleRegistry.create()
                // Abort startup on violations
                .failOnViolation()

                // Every entity in the project must have these 5 annotations
                .forAll(
                        Domain.class,
                        DataClassification.class,
                        Comment.class
                );

                // Add package-specific rules here as needed:
                //
                // .forPackage("com.spring.mockspring.entity.**",
                //             LawfulBasis.class, DataRetention.class)
                //
                // Or entity-specific rules:
                //
                // .forEntity(User.class,
                //            Purpose.class, Criticality.class, Pii.class);
    }
}
