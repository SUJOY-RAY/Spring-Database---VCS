package com.dbvcs.annotation;

/**
 * Suggested constants for {@code FieldMetadata.piiCategory()}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class PiiCategory {
    private PiiCategory() {}

    public static final String NAME          = "NAME";
    public static final String EMAIL         = "EMAIL";
    public static final String PHONE         = "PHONE";
    public static final String ADDRESS       = "ADDRESS";
    public static final String DATE_OF_BIRTH = "DATE_OF_BIRTH";
    /** Government-issued ID (e.g. passport, national ID). */
    public static final String GOVERNMENT_ID = "GOVERNMENT_ID";
    /** Social Security Number. */
    public static final String SSN           = "SSN";
    public static final String CREDIT_CARD   = "CREDIT_CARD";
    public static final String BANK_ACCOUNT  = "BANK_ACCOUNT";
    /** GPS / location data. */
    public static final String LOCATION      = "LOCATION";
    public static final String IP_ADDRESS    = "IP_ADDRESS";
    /** Biometric data (fingerprint, face, retina). */
    public static final String BIOMETRIC     = "BIOMETRIC";
    /** Health / medical records. */
    public static final String HEALTH        = "HEALTH";
    /** Any other PII not covered above. */
    public static final String OTHER         = "OTHER";
}
