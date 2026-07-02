package com.dbvcs.annotation.enums;

/**
 * Suggested update strategy constants for use with {@link com.dbvcs.annotation.UpdateStrategy}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @UpdateStrategy(value = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.update-types=APPEND_ONLY,UPSERT,FULL_REFRESH,EVENT_DRIVEN
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class UpdateType {
    public static final String APPEND_ONLY   = "APPEND_ONLY";
    public static final String UPSERT        = "UPSERT";
    public static final String FULL_REFRESH  = "FULL_REFRESH";
    public static final String EVENT_DRIVEN  = "EVENT_DRIVEN";

    private UpdateType() {}
}
