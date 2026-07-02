package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the masking strategy to apply when displaying this field's data.
 *
 * <p>The {@code strategy} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.masking-strategies} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: FULL, PARTIAL, HASH, TOKENIZE.
 *
 * <pre>
 *   {@literal @}Masking(strategy = "PARTIAL")
 *   private String phoneNumber;
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Masking {
    /** The masking strategy to apply (project-specific string value). */
    String strategy();
}
