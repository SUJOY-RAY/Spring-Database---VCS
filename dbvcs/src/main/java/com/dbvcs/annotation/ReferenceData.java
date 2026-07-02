package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks an entity as reference data (e.g. ISO country codes, currency codes).
 *
 * <pre>
 *   {@literal @}ReferenceData("ISO Country Codes")
 *   public class Country { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ReferenceData {
    /** Optional description of the reference dataset. */
    String value() default "";
}
