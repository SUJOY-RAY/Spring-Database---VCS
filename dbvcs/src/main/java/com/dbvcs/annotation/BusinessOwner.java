package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Identifies the business team or individual who owns this entity.
 *
 * <pre>
 *   {@literal @}BusinessOwner("Finance Team")
 *   public class Invoice { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface BusinessOwner {
    /** Name of the owning team or person. */
    String value();
}
