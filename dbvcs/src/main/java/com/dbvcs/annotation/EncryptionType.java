package com.dbvcs.annotation;

/**
 * Suggested constants for {@code FieldMetadata.encryption()}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class EncryptionType {
    private EncryptionType() {}

    /** AES-128 symmetric encryption. */
    public static final String AES128    = "AES128";
    /** AES-256 symmetric encryption (recommended). */
    public static final String AES256    = "AES256";
    /** RSA asymmetric encryption. */
    public static final String RSA       = "RSA";
    /** bcrypt hashing (suitable for passwords). */
    public static final String BCRYPT    = "BCRYPT";
    /** Argon2 hashing (modern password hashing). */
    public static final String ARGON2    = "ARGON2";
    /** SHA-256 one-way hash. */
    public static final String SHA256    = "SHA256";
    /** SHA-512 one-way hash. */
    public static final String SHA512    = "SHA512";
    /** Format-preserving encryption (useful for structured data like credit cards). */
    public static final String FPE       = "FPE";
    /** Tokenisation — original value replaced by a non-reversible token. */
    public static final String TOKENIZED = "TOKENIZED";
}
