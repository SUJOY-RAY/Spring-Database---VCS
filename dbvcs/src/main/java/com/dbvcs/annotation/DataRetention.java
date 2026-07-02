package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the data retention policy for an entity.
 *
 * <p>The {@code type} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.retention-types} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: ONE_YEAR, THREE_YEARS, FIVE_YEARS, SEVEN_YEARS, TEN_YEARS,
 * INDEFINITE, UNTIL_CONSENT_WITHDRAWN, CUSTOM.
 *
 * <pre>
 *   {@literal @}DataRetention(type = "SEVEN_YEARS", description = "Legal retention policy")
 *   public class Invoice { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DataRetention {
    /** The retention period type (project-specific string value). */
    String type();

    /** Description or policy reference. */
    String description() default "";
}
