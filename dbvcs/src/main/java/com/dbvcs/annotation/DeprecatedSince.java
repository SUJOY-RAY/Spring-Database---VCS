package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Documents when an entity was deprecated and what should be used instead.
 *
 * <pre>
 *   {@literal @}DeprecatedSince(version = "2.0", replacement = "CustomerV2")
 *   public class Customer { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DeprecatedSince {
    /** The version in which this entity was deprecated. */
    String version();

    /** The class or entity name that replaces this one. */
    String replacement() default "";
}
