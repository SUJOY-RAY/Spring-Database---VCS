package com.dbvcs.annotation.enums;

/**
 * Suggested table type constants for use with {@link com.dbvcs.annotation.TableType}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @TableType(type = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.table-types=MASTER,TRANSACTIONAL,LOOKUP,MY_TYPE
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class TableTypeValue {
    public static final String MASTER        = "MASTER";
    public static final String TRANSACTIONAL = "TRANSACTIONAL";
    public static final String LOOKUP        = "LOOKUP";
    public static final String CONFIGURATION = "CONFIGURATION";
    public static final String STAGING       = "STAGING";
    public static final String AUDIT         = "AUDIT";
    public static final String HISTORY       = "HISTORY";
    public static final String TEMPORARY     = "TEMPORARY";

    private TableTypeValue() {}
}
