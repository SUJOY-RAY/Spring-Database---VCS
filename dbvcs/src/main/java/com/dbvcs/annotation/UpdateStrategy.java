package com.dbvcs.annotation;

/**
 * Suggested constants for {@code FieldMetadata.updateStrategy()}.
 * Use these for autocomplete, or pass any custom string directly.
 */
public final class UpdateStrategy {
    private UpdateStrategy() {}

    /** Optimistic locking — conflicts detected at commit time via version/timestamp check. */
    public static final String OPTIMISTIC  = "OPTIMISTIC";
    /** Pessimistic locking — row is locked for the duration of the transaction. */
    public static final String PESSIMISTIC = "PESSIMISTIC";
    /** Field is immutable after creation; updates are not allowed. */
    public static final String IMMUTABLE   = "IMMUTABLE";
    /** Last write wins — no conflict detection. */
    public static final String LAST_WRITE  = "LAST_WRITE";
}
