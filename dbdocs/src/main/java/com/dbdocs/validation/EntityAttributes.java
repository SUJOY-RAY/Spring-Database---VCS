package com.dbdocs.validation;

/**
 * String constants for {@code @EntityMetadata} attribute names.
 *
 * <p>Use with {@link ValidationRuleRegistry#requireEntityAttributes} to get
 * IDE autocomplete and compile-time safety instead of raw strings:
 *
 * <pre>{@code
 * .requireEntityAttributes(
 *     EntityAttributes.DOMAIN,
 *     EntityAttributes.CLASSIFICATION,
 *     EntityAttributes.CRITICALITY
 * )
 * }</pre>
 */
public final class EntityAttributes {

    private EntityAttributes() {}

    /** {@code description} — human-readable description of the entity. */
    public static final String DESCRIPTION       = "description";

    /** {@code domain} — business domain (e.g. "CUSTOMER", "ORDER"). */
    public static final String DOMAIN            = "domain";

    /** {@code type} — entity type (e.g. MASTER, TRANSACTIONAL). See {@code EntityType}. */
    public static final String TYPE              = "type";

    /** {@code classification} — data sensitivity level. See {@code DataClassification}. */
    public static final String CLASSIFICATION    = "classification";

    /** {@code criticality} — business criticality level. See {@code CriticalityLevel}. */
    public static final String CRITICALITY       = "criticality";

    /** {@code retention} — data retention policy. See {@code DataRetentionPolicy}. */
    public static final String RETENTION         = "retention";

    /** {@code refreshFrequency} — how often data is updated. See {@code RefreshFrequency}. */
    public static final String REFRESH_FREQUENCY = "refreshFrequency";

    /** {@code sourceSystem} — originating system (e.g. "SAP", "SALESFORCE"). */
    public static final String SOURCE_SYSTEM     = "sourceSystem";

    /** {@code submodule} — component or submodule this entity belongs to. */
    public static final String SUBMODULE         = "submodule";

    /** {@code integration} — external system integration context. */
    public static final String INTEGRATION       = "integration";

    /** {@code accessLevel} — access level required. See {@code AccessLevel}. */
    public static final String ACCESS_LEVEL      = "accessLevel";

    /** {@code auditable} — whether entity changes are audited. */
    public static final String AUDITABLE         = "auditable";

    /** {@code versioned} — whether entity maintains version history. */
    public static final String VERSIONED         = "versioned";

    /** {@code publicApi} — whether entity is exposed via public APIs. */
    public static final String PUBLIC_API        = "publicApi";

    /** {@code consentRequired} — whether user consent is required. */
    public static final String CONSENT_REQUIRED  = "consentRequired";
}
