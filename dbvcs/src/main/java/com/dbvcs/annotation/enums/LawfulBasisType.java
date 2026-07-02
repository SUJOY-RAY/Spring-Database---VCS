package com.dbvcs.annotation.enums;

/**
 * Suggested GDPR lawful basis constants for use with {@link com.dbvcs.annotation.LawfulBasis}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @LawfulBasis(type = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.lawful-basis-types=CONSENT,CONTRACT,LEGAL_OBLIGATION
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class LawfulBasisType {
    public static final String CONSENT              = "CONSENT";
    public static final String CONTRACT             = "CONTRACT";
    public static final String LEGAL_OBLIGATION     = "LEGAL_OBLIGATION";
    public static final String VITAL_INTERESTS      = "VITAL_INTERESTS";
    public static final String PUBLIC_TASK          = "PUBLIC_TASK";
    public static final String LEGITIMATE_INTERESTS = "LEGITIMATE_INTERESTS";

    private LawfulBasisType() {}
}
