package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Indicates that processing data in this entity or field requires explicit user consent.
 *
 * <pre>
 *   {@literal @}ConsentRequired("Marketing communications")
 *   private Boolean marketingOptIn;
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ConsentRequired {
    /** Purpose for which consent is needed. */
    String value() default "";
}
