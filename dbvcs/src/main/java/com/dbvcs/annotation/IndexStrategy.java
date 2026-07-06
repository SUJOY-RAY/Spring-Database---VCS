package com.dbvcs.annotation;

/**
 * Suggested constants for {@code FieldMetadata.indexStrategy()}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class IndexStrategy {
    private IndexStrategy() {}

    /** No index. */
    public static final String NONE      = "NONE";
    /** Primary key index. */
    public static final String PRIMARY   = "PRIMARY";
    /** Unique constraint index. */
    public static final String UNIQUE    = "UNIQUE";
    /** Standard non-unique index. */
    public static final String INDEX     = "INDEX";
    /** Part of a composite / multi-column index. */
    public static final String COMPOSITE = "COMPOSITE";
    /** Full-text search index. */
    public static final String FULLTEXT  = "FULLTEXT";
    /** Spatial / GIS index. */
    public static final String SPATIAL   = "SPATIAL";
    /** Partial (filtered) index. */
    public static final String PARTIAL   = "PARTIAL";
}
