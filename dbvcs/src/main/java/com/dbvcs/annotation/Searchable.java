package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks a field as searchable — the application exposes this field for query/filter operations.
 *
 * <pre>
 *   {@literal @}Searchable
 *   private String customerEmail;
 * </pre>
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Searchable {
}
