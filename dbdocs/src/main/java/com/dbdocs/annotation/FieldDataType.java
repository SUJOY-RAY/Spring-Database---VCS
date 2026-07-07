package com.dbdocs.annotation;

/**
 * Suggested constants for {@code FieldMetadata.dataType()}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class FieldDataType {
    private FieldDataType() {}

    public static final String STRING     = "STRING";
    public static final String INTEGER    = "INTEGER";
    public static final String LONG       = "LONG";
    public static final String DECIMAL    = "DECIMAL";
    public static final String BOOLEAN    = "BOOLEAN";
    public static final String DATE       = "DATE";
    public static final String TIME       = "TIME";
    public static final String TIMESTAMP  = "TIMESTAMP";
    public static final String UUID       = "UUID";
    /** Binary / byte-array data (e.g. files, images). */
    public static final String BINARY     = "BINARY";
    /** JSON / JSONB column. */
    public static final String JSON       = "JSON";
    /** A single embedded / nested object. */
    public static final String OBJECT     = "OBJECT";
    /** A collection / association (one-to-many, many-to-many). */
    public static final String COLLECTION = "COLLECTION";
    /** Enumerated type. */
    public static final String ENUM       = "ENUM";
    /** Database-level numeric identifier (e.g. BIGINT PK / FK). */
    public static final String BIGINT     = "BIGINT";
    public static final String TEXT       = "TEXT";
}
