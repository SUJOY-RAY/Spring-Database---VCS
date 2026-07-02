package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the primary business module that owns this entity.
 *
 * <p>The {@code name} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.modules} in
 * {@code application.properties} / {@code application.yml}.
 *
 * <p>Named {@code BusinessModule} to avoid collision with {@code java.lang.Module}.
 *
 * <pre>
 *   {@literal @}BusinessModule(name = "ORDER", description = "Order Management")
 *   public class Order { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface BusinessModule {
    /** The business module this entity belongs to (project-specific string value). */
    String name();

    /** Human-readable description of the module context. */
    String description() default "";
}
