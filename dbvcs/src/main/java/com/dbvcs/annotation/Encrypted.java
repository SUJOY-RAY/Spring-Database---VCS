package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Indicates that this field or entity's data is stored encrypted.
 *
 * <p>The {@code algorithm} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.encryption-types} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: AES128, AES256, RSA, BCRYPT, ARGON2, OTHER.
 *
 * <pre>
 *   {@literal @}Encrypted(algorithm = "AES256")
 *   private String creditCardNumber;
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Encrypted {
    /** Encryption algorithm used (project-specific string value). */
    String algorithm();
}
