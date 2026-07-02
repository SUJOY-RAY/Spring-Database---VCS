package com.dbvcs.annotation.enums;

/**
 * Suggested criticality level constants for use with {@link com.dbvcs.annotation.Criticality}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @Criticality(level = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.criticality-levels=LOW,MEDIUM,HIGH,CRITICAL
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class CriticalityLevel {
    public static final String LOW      = "LOW";
    public static final String MEDIUM   = "MEDIUM";
    public static final String HIGH     = "HIGH";
    public static final String CRITICAL = "CRITICAL";

    private CriticalityLevel() {}
}
