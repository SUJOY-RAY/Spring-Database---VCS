package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Indicates that the value of this field is derived from another source column or field.
 *
 * <pre>
 *   {@literal @}DerivedFrom("customer_master.email")
 *   private String email;
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DerivedFrom {
    /** Source column or path (e.g. {@code "table.column"}). */
    String value();
}
