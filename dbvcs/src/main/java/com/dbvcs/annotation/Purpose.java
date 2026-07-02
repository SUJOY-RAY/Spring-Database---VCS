package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Describes the business purpose of an entity.
 *
 * <pre>
 *   {@literal @}Purpose(value = "Stores customer information", description = "Primary customer master")
 *   public class User { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Purpose {
    /** Short business purpose statement. */
    String value();

    /** Extended description. */
    String description() default "";
}
