package com.dbvcs.annotation;

/**
 * Suggested constants for {@code EntityMetadata.criticality()}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class CriticalityLevel {
    private CriticalityLevel() {}

    /** Minimal business impact if unavailable. */
    public static final String LOW      = "LOW";
    /** Moderate impact; some business processes affected. */
    public static final String MEDIUM   = "MEDIUM";
    /** Significant impact; important business processes depend on it. */
    public static final String HIGH     = "HIGH";
    /** Mission-critical; system-wide or revenue impact if unavailable. */
    public static final String CRITICAL = "CRITICAL";
}
