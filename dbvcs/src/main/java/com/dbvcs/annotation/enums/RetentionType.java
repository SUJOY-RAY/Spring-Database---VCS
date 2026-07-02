package com.dbvcs.annotation.enums;

/**
 * Suggested retention type constants for use with {@link com.dbvcs.annotation.DataRetention}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @DataRetention(type = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.retention-types=ONE_YEAR,SEVEN_YEARS,INDEFINITE,MY_POLICY
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class RetentionType {
    public static final String ONE_YEAR                 = "ONE_YEAR";
    public static final String THREE_YEARS              = "THREE_YEARS";
    public static final String FIVE_YEARS               = "FIVE_YEARS";
    public static final String SEVEN_YEARS              = "SEVEN_YEARS";
    public static final String TEN_YEARS                = "TEN_YEARS";
    public static final String INDEFINITE               = "INDEFINITE";
    public static final String UNTIL_CONSENT_WITHDRAWN  = "UNTIL_CONSENT_WITHDRAWN";
    public static final String CUSTOM                   = "CUSTOM";

    private RetentionType() {}
}
