package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the GDPR lawful basis under which this data is processed.
 *
 * <p>The {@code type} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.lawful-basis-types} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: CONSENT, CONTRACT, LEGAL_OBLIGATION, VITAL_INTERESTS,
 * PUBLIC_TASK, LEGITIMATE_INTERESTS.
 *
 * <pre>
 *   {@literal @}LawfulBasis(type = "CONSENT", description = "Customer consent obtained via opt-in")
 *   public class UserMarketingPreference { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface LawfulBasis {
    /** The GDPR lawful basis for processing (project-specific string value). */
    String type();

    /** Details or justification. */
    String description() default "";
}
