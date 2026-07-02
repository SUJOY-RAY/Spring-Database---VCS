package com.dbvcs.annotation.enums;

/**
 * Suggested access level constants for use with {@link com.dbvcs.annotation.AccessLevel}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @AccessLevel(level = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.access-levels=PUBLIC,INTERNAL_ONLY,RESTRICTED,ADMIN_ONLY
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class AccessLevelValue {
    public static final String PUBLIC        = "PUBLIC";
    public static final String INTERNAL_ONLY = "INTERNAL_ONLY";
    public static final String RESTRICTED    = "RESTRICTED";
    public static final String ADMIN_ONLY    = "ADMIN_ONLY";

    private AccessLevelValue() {}
}
