package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Documents the business purpose of a database index on this field.
 *
 * <pre>
 *   {@literal @}IndexedFor(purpose = "Customer Lookup by email")
 *   private String email;
 * </pre>
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface IndexedFor {
    /** Description of why this field is indexed. */
    String purpose();
}
