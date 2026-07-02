package com.dbvcs.annotation.enums;

/**
 * Suggested quality level constants for use with {@link com.dbvcs.annotation.DataQualityLevel}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @DataQualityLevel(level = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.quality-levels=LOW,MEDIUM,HIGH,VERIFIED
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class QualityLevel {
    public static final String LOW      = "LOW";
    public static final String MEDIUM   = "MEDIUM";
    public static final String HIGH     = "HIGH";
    public static final String VERIFIED = "VERIFIED";

    private QualityLevel() {}
}
