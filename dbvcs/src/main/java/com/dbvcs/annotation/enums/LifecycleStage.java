package com.dbvcs.annotation.enums;

/**
 * Suggested lifecycle stage constants for use with {@link com.dbvcs.annotation.Lifecycle}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @Lifecycle(value = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.lifecycle-stages=ACTIVE,DEPRECATED,ARCHIVED,LEGACY
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class LifecycleStage {
    public static final String ACTIVE     = "ACTIVE";
    public static final String DEPRECATED = "DEPRECATED";
    public static final String ARCHIVED   = "ARCHIVED";
    public static final String LEGACY     = "LEGACY";

    private LifecycleStage() {}
}
