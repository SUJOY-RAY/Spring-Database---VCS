package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the strategy used when writing data to this entity.
 *
 * <p>The {@code value} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.update-types} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: APPEND_ONLY, UPSERT, FULL_REFRESH, EVENT_DRIVEN.
 *
 * <pre>
 *   {@literal @}UpdateStrategy("UPSERT")
 *   public class ProductStock { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface UpdateStrategy {
    /** The write/update strategy (project-specific string value). */
    String value();
}
