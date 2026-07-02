package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the current lifecycle stage of an entity.
 *
 * <p>The {@code value} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.lifecycle-stages} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: ACTIVE, DEPRECATED, ARCHIVED, LEGACY.
 *
 * <pre>
 *   {@literal @}Lifecycle("DEPRECATED")
 *   public class LegacyOrder { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Lifecycle {
    /** The current lifecycle stage (project-specific string value). */
    String value();
}
