package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks an entity or field as containing Sensitive Personal Data (GDPR Article 9).
 *
 * <pre>
 *   {@literal @}Spd("Health-related information")
 *   private String medicalCondition;
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Spd {
    /** Description of the sensitive personal data. */
    String value() default "";
}
