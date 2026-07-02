package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the business criticality of an entity.
 *
 * <p>The {@code level} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.criticality-levels} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: LOW, MEDIUM, HIGH, CRITICAL.
 *
 * <pre>
 *   {@literal @}Criticality(level = "HIGH", description = "Critical for order processing")
 *   public class Order { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Criticality {
    /** Criticality level (project-specific string value). */
    String level();

    /** Human-readable justification. */
    String description() default "";
}
