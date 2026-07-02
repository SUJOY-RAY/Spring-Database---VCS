package com.dbvcs.annotation.enums;

/**
 * Suggested encryption algorithm constants for use with {@link com.dbvcs.annotation.Encrypted}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @Encrypted(algorithm = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.encryption-types=AES256,RSA,BCRYPT,MY_ALGO
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class EncryptionType {
    public static final String AES128 = "AES128";
    public static final String AES256 = "AES256";
    public static final String RSA    = "RSA";
    public static final String BCRYPT = "BCRYPT";
    public static final String ARGON2 = "ARGON2";
    public static final String OTHER  = "OTHER";

    private EncryptionType() {}
}
