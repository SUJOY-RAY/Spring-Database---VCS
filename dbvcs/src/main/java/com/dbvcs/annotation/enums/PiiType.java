package com.dbvcs.annotation.enums;

/**
 * Suggested PII type constants for use with {@link com.dbvcs.annotation.PiiCategory}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @PiiCategory(type = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.pii-types=NAME,EMAIL,PHONE,ADDRESS,MY_PII_TYPE
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class PiiType {
    public static final String NAME          = "NAME";
    public static final String EMAIL         = "EMAIL";
    public static final String PHONE         = "PHONE";
    public static final String ADDRESS       = "ADDRESS";
    public static final String DATE_OF_BIRTH = "DATE_OF_BIRTH";
    public static final String NATIONAL_ID   = "NATIONAL_ID";
    public static final String PASSPORT      = "PASSPORT";
    public static final String SSN           = "SSN";
    public static final String IP_ADDRESS    = "IP_ADDRESS";
    public static final String DEVICE_ID     = "DEVICE_ID";
    public static final String BIOMETRIC     = "BIOMETRIC";
    public static final String FINANCIAL     = "FINANCIAL";
    public static final String HEALTH        = "HEALTH";
    public static final String OTHER         = "OTHER";

    private PiiType() {}
}
