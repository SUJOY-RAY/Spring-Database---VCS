package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Specifies the category of PII stored in a field.
 * Only valid when {@link Pii} is also present on the same element.
 *
 * <p>The {@code type} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.pii-types} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: NAME, EMAIL, PHONE, ADDRESS, DATE_OF_BIRTH, NATIONAL_ID,
 * PASSPORT, SSN, IP_ADDRESS, DEVICE_ID, BIOMETRIC, FINANCIAL, HEALTH, OTHER.
 *
 * <pre>
 *   {@literal @}Pii
 *   {@literal @}PiiCategory(type = "EMAIL", description = "Customer email address")
 *   private String email;
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface PiiCategory {
    /** The specific PII type (project-specific string value). */
    String type();

    /** Additional context for this PII field. */
    String description() default "";
}
