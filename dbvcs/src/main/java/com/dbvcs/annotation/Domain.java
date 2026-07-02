package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the business domain for this entity.
 *
 * <p>The {@code name} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.domains} in
 * {@code application.properties} / {@code application.yml}.
 *
 * <pre>
 *   {@literal @}Domain(name = "CUSTOMER", description = "Customer domain")
 *   public class User { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Domain {
    /** The domain this entity belongs to (project-specific string value). */
    String name();

    /** Human-readable domain description. */
    String description() default "";
}
