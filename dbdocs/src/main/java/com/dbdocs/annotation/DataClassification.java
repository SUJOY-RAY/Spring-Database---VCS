package com.dbdocs.annotation;

/**
 * Suggested constants for {@code classification()} in {@code EntityMetadata} and {@code FieldMetadata}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class DataClassification {
    private DataClassification() {}

    /** Freely accessible to the public. */
    public static final String PUBLIC       = "PUBLIC";
    /** Internal use only — not for external exposure. */
    public static final String INTERNAL     = "INTERNAL";
    /** Sensitive data requiring controlled access. */
    public static final String CONFIDENTIAL = "CONFIDENTIAL";
    /** Highly sensitive data with strict access controls. */
    public static final String RESTRICTED   = "RESTRICTED";
    /** Top-secret / regulatory data (e.g. PCI, HIPAA). */
    public static final String SECRET       = "SECRET";
}
