package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Attaches additional implementation notes to a JPA entity or field.
 *
 * <pre>
 *   {@literal @}Remarks("This table is populated nightly via the ETL pipeline.")
 *   public class Order { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Remarks {
    /** Implementation notes. */
    String value();
}
