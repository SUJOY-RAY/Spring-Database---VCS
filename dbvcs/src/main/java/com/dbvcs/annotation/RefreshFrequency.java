package com.dbvcs.annotation;

/**
 * Suggested constants for {@code EntityMetadata.refreshFrequency()}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class RefreshFrequency {
    private RefreshFrequency() {}

    /** Updated in real time as events occur. */
    public static final String REALTIME      = "REALTIME";
    /** Updated every few minutes (near real-time). */
    public static final String NEAR_REALTIME = "NEAR_REALTIME";
    /** Updated once per hour. */
    public static final String HOURLY        = "HOURLY";
    /** Updated once per day. */
    public static final String DAILY         = "DAILY";
    /** Updated once per week. */
    public static final String WEEKLY        = "WEEKLY";
    /** Updated once per month. */
    public static final String MONTHLY       = "MONTHLY";
    /** Updated on an ad-hoc or manual basis. */
    public static final String ON_DEMAND     = "ON_DEMAND";
}
