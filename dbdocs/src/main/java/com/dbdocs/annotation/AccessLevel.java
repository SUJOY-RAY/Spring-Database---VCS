package com.dbdocs.annotation;

/**
 * Suggested constants for {@code accessLevel()} in {@code EntityMetadata} and {@code FieldMetadata}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class AccessLevel {
    private AccessLevel() {}

    /** Accessible to everyone, including anonymous users. */
    public static final String PUBLIC     = "PUBLIC";
    /** Accessible to authenticated employees / internal systems only. */
    public static final String INTERNAL   = "INTERNAL";
    /** Restricted to a specific group or role. */
    public static final String RESTRICTED = "RESTRICTED";
    /** Accessible to privileged / admin roles only. */
    public static final String ADMIN_ONLY = "ADMIN_ONLY";
}
