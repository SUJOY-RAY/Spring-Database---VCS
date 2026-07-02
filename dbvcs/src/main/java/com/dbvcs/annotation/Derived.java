package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks a field as a computed/derived value and documents the expression used.
 *
 * <pre>
 *   {@literal @}Derived(expression = "first_name + ' ' + last_name")
 *   private String fullName;
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Derived {
    /** The expression or formula that produces this field's value. */
    String expression();
}
