package com.dbvcs.validation;

/**
 * String constants for {@code @FieldMetadata} attribute names.
 *
 * <p>Use with {@link ValidationRuleRegistry#requireFieldAttributes} to get
 * IDE autocomplete and compile-time safety instead of raw strings:
 *
 * <pre>{@code
 * .requireFieldAttributes(
 *     FieldAttributes.DATA_TYPE,
 *     FieldAttributes.CLASSIFICATION
 * )
 * }</pre>
 */
public final class FieldAttributes {

    private FieldAttributes() {}

    /** {@code description} — human-readable description of the field. */
    public static final String DESCRIPTION      = "description";

    /** {@code dataType} — data type classification. See {@code FieldDataType}. */
    public static final String DATA_TYPE        = "dataType";

    /** {@code domain} — business domain this field relates to. */
    public static final String DOMAIN           = "domain";

    /** {@code classification} — data sensitivity level. See {@code DataClassification}. */
    public static final String CLASSIFICATION   = "classification";

    /** {@code pii} — whether this field contains PII. */
    public static final String PII              = "pii";

    /** {@code piiCategory} — PII category (e.g. EMAIL, SSN). See {@code PiiCategory}. */
    public static final String PII_CATEGORY     = "piiCategory";

    /** {@code encryption} — encryption algorithm applied. See {@code EncryptionType}. */
    public static final String ENCRYPTION       = "encryption";

    /** {@code searchable} — search capability for this field. See {@code SearchStrategy}. */
    public static final String SEARCHABLE       = "searchable";

    /** {@code indexStrategy} — database index strategy. See {@code IndexStrategy}. */
    public static final String INDEX_STRATEGY   = "indexStrategy";

    /** {@code updateStrategy} — concurrency/update strategy. See {@code UpdateStrategy}. */
    public static final String UPDATE_STRATEGY  = "updateStrategy";

    /** {@code accessLevel} — access level required. See {@code AccessLevel}. */
    public static final String ACCESS_LEVEL     = "accessLevel";

    /** {@code transactional} — whether field is part of transactional data. */
    public static final String TRANSACTIONAL    = "transactional";

    /** {@code audited} — whether changes to this field are audited. */
    public static final String AUDITED          = "audited";

    /** {@code consentRequired} — whether user consent is required. */
    public static final String CONSENT_REQUIRED = "consentRequired";
}
