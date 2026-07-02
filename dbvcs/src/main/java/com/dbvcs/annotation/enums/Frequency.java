package com.dbvcs.annotation.enums;

/**
 * Suggested frequency constants for use with {@link com.dbvcs.annotation.RefreshFrequency}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @RefreshFrequency(value = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.frequencies=REALTIME,HOURLY,DAILY,WEEKLY,MONTHLY
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class Frequency {
    public static final String REALTIME = "REALTIME";
    public static final String HOURLY   = "HOURLY";
    public static final String DAILY    = "DAILY";
    public static final String WEEKLY   = "WEEKLY";
    public static final String MONTHLY  = "MONTHLY";

    private Frequency() {}
}
