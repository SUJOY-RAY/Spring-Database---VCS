package com.dbvcs.annotation;

/**
 * Suggested constants for {@code EntityMetadata.retention()}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class DataRetentionPolicy {
    private DataRetentionPolicy() {}

    /** Data is kept indefinitely and never purged. */
    public static final String PERMANENT  = "PERMANENT";
    /** Short-lived data that is deleted after processing. */
    public static final String TEMPORARY  = "TEMPORARY";
    /** Data is anonymised after the retention window rather than deleted. */
    public static final String ANONYMISED = "ANONYMISED";


    public static final String ONE_DAY = "ONE_DAY";
    public static final String SEVEN_DAYS = "SEVEN_DAYS";
    public static final String THIRTY_DAYS = "THIRTY_DAYS";
    public static final String NINETY_DAYS = "NINETY_DAYS";
    public static final String SIX_MONTHS = "SIX_MONTHS";
    public static final String ONE_YEAR = "ONE_YEAR";
    public static final String TWO_YEARS = "TWO_YEARS";
    public static final String THREE_YEARS = "THREE_YEARS";
    public static final String FIVE_YEARS = "FIVE_YEARS";
    public static final String SEVEN_YEARS = "SEVEN_YEARS";
    public static final String TEN_YEARS = "TEN_YEARS";
}
