package com.dbvcs.annotation;

/**
 * Suggested constants for {@code FieldMetadata.searchable()}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class SearchStrategy {
    private SearchStrategy() {}

    /** No search support on this field. */
    public static final String NONE      = "NONE";
    /** Full-text / tokenised search (e.g. LIKE, FTS index). */
    public static final String FULL_TEXT = "FULL_TEXT";
    /** Exact equality match only. */
    public static final String EXACT     = "EXACT";
    /** Range queries (greater than, less than, between). */
    public static final String RANGE     = "RANGE";
    /** Prefix / starts-with queries. */
    public static final String PREFIX    = "PREFIX";
    /** Fuzzy / approximate matching. */
    public static final String FUZZY     = "FUZZY";
}
