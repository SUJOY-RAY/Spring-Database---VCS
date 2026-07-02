package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Classifies the role of the underlying database table.
 *
 * <p>The {@code type} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.table-types} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: MASTER, TRANSACTIONAL, LOOKUP, CONFIGURATION, STAGING, AUDIT, HISTORY, TEMPORARY.
 *
 * <pre>
 *   {@literal @}TableType(type = "MASTER", description = "Master data table")
 *   public class Product { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface TableType {
    /** The table role classification (project-specific string value). */
    String type();

    /** Human-readable description. */
    String description() default "";
}
