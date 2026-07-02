package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the data classification / sensitivity level for an entity or field.
 *
 * <p>The {@code level} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.data-classification-levels} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED.
 *
 * <pre>
 *   {@literal @}DataClassification(level = "CONFIDENTIAL", description = "Internal business data")
 *   public class Order { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DataClassification {
    /** Sensitivity level (project-specific string value). */
    String level();

    /** Human-readable justification or context. */
    String description() default "";
}
