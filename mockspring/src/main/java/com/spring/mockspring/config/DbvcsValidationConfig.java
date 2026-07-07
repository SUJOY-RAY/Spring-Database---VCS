package com.spring.mockspring.config;

import com.dbdocs.annotation.*;
import com.dbdocs.validation.EntityAttributes;
import com.dbdocs.validation.FieldAttributes;
import com.dbdocs.validation.ValidationRuleRegistry;
import com.spring.mockspring.entity.Comment;

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
                // .failOnViolation()

                // Every entity must have @EntityMetadata
                .forAll(EntityMetadata.class)

                // Required @EntityMetadata attributes on every entity
                .requireEntityAttributes(
                        EntityAttributes.DESCRIPTION,
                        EntityAttributes.DOMAIN,
                        EntityAttributes.TYPE,
                        EntityAttributes.SUBMODULE
                )

                // Stricter attribute requirements for a specific entity class
                // .requireEntityAttributesFor(Comment.class,
                //         EntityAttributes.CLASSIFICATION,
                //         EntityAttributes.CRITICALITY
                // )

                // Or scoped to a package (supports * and ** wildcards)
                // .requireEntityAttributesFor("com.spring.mockspring.entity.**",
                //         EntityAttributes.CLASSIFICATION
                // )

                // Require @FieldMetadata on Comment fields
                // .forPackage("com.spring.mockspring.entity.Comment", FieldMetadata.class)

                // Required @FieldMetadata attributes on Comment fields specifically
                .requireFieldAttributesFor(Comment.class,
                        FieldAttributes.DATA_TYPE,
                        FieldAttributes.CLASSIFICATION
                )

                // Or globally across all entities that have @FieldMetadata
                // .requireFieldAttributes(
                //         FieldAttributes.DATA_TYPE
                // )
                ;
    }
}
