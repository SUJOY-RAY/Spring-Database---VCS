package com.dbvcs.annotation.enums;

/**
 * Suggested data classification constants for use with {@link com.dbvcs.annotation.DataClassification}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @DataClassification(level = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.data-classification-levels=PUBLIC,INTERNAL,CONFIDENTIAL,RESTRICTED
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class DataClassificationLevel {
    public static final String PUBLIC       = "PUBLIC";
    public static final String INTERNAL     = "INTERNAL";
    public static final String CONFIDENTIAL = "CONFIDENTIAL";
    public static final String RESTRICTED   = "RESTRICTED";

    private DataClassificationLevel() {}
}
