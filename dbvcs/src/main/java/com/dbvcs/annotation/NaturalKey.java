package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks a field as a natural key — an identifier whose value is derived from
 * the real-world domain (e.g. email, ISBN, tax ID).
 *
 * <pre>
 *   {@literal @}NaturalKey
 *   private String email;
 * </pre>
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface NaturalKey {
}
