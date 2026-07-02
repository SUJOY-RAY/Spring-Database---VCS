package com.dbvcs.annotation.enums;

/**
 * Suggested source system constants for use with {@link com.dbvcs.annotation.SourceSystem}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @SourceSystem(name = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.source-systems=CRM,ERP,SAP,MY_SYSTEM
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class SourceSystemType {
    public static final String CRM        = "CRM";
    public static final String ERP        = "ERP";
    public static final String SAP        = "SAP";
    public static final String SALESFORCE = "SALESFORCE";
    public static final String INTERNAL   = "INTERNAL";
    public static final String MANUAL     = "MANUAL";
    public static final String API        = "API";
    public static final String ETL        = "ETL";
    public static final String LEGACY     = "LEGACY";
    public static final String OTHER      = "OTHER";

    private SourceSystemType() {}
}
