package com.dbdocs.annotation;

/**
 * Suggested constants for {@code EntityMetadata.type()}.
 * Use these for autocomplete, or pass any custom string directly.
 *
 * <pre>{@code
 * @EntityMetadata(type = EntityType.MASTER, ...)
 * // or
 * @EntityMetadata(type = "DOMAIN_SPECIFIC_TYPE", ...)
 * }</pre>
 */
public final class EntityType {
    private EntityType() {}

    /** Core master data (e.g. Customer, Product). */
    public static final String MASTER       = "MASTER";
    /** Event-driven, high-volume operational data. */
    public static final String TRANSACTIONAL = "TRANSACTIONAL";
    /** Denormalised data for analytics / reporting. */
    public static final String DIMENSIONAL  = "DIMENSIONAL";
    /** Aggregated or pre-computed data. */
    public static final String AGGREGATE    = "AGGREGATE";
    /** Temporary / staging data. */
    public static final String STAGING      = "STAGING";
    /** Audit / change-log data. */
    public static final String AUDIT        = "AUDIT";
    /** Reference / lookup data. */
    public static final String REFERENCE    = "REFERENCE";
}
