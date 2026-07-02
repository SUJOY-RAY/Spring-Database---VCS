package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares a logical child module within a parent {@link Module}.
 *
 * <pre>
 *   {@literal @}Submodule(name = "OrderInfo", description = "Order details sub-domain")
 *   public class Order { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Submodule {
    /** Submodule name (free-form). */
    String name();

    /** Human-readable description. */
    String description() default "";
}
