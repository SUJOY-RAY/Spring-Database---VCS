package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Documents data quality rules that apply to this entity or field.
 *
 * <pre>
 *   {@literal @}DataQuality(rules = {"Email cannot be null", "Order ID must be unique"})
 *   public class Order { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DataQuality {
    /** One or more quality rules as human-readable strings. */
    String[] rules();
}
