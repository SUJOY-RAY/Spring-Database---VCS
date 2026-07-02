package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks an entity or field as containing Personally Identifiable Information (PII).
 *
 * <p>When applied to a field, pair with {@link PiiCategory} to specify the exact PII type.
 *
 * <pre>
 *   {@literal @}Pii("Contains Personally Identifiable Information")
 *   private String email;
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Pii {
    /** Optional description explaining the PII context. */
    String value() default "";
}
