package com.dbvcs.annotation.enums;

/**
 * Suggested masking strategy constants for use with {@link com.dbvcs.annotation.Masking}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @Masking(strategy = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.masking-strategies=FULL,PARTIAL,HASH,TOKENIZE
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class MaskingStrategy {
    public static final String FULL      = "FULL";
    public static final String PARTIAL   = "PARTIAL";
    public static final String HASH      = "HASH";
    public static final String TOKENIZE  = "TOKENIZE";

    private MaskingStrategy() {}
}
