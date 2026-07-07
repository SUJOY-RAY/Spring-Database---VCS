package com.dbdocs.annotation;

import java.lang.annotation.*;

/**
 * Unified annotation for describing a field with comprehensive metadata.
 * Consolidates all field-level descriptive, security, and governance information.
 * 
 * <p>This annotation provides a single point for declaring field-level metadata including:
 * <ul>
 *   <li>Data characteristics (type, domain, searchability, indexing)</li>
 *   <li>Security and compliance (classification, PII, encryption)</li>
 *   <li>Audit and transactional behavior</li>
 *   <li>Access control and consent management</li>
 * </ul>
 * 
 * <p>Example usage:
 * <pre>
 * {@code
 * @FieldMetadata(
 *     description = "User email address",
 *     dataType = "STRING",
 *     domain = "CUSTOMER",
 *     classification = "CONFIDENTIAL",
 *     pii = true,
 *     piiCategory = "EMAIL",
 *     encryption = "AES256",
 *     searchable = "EXACT",
 *     indexStrategy = "UNIQUE",
 *     audited = true,
 *     accessLevel = "INTERNAL",
 *     consentRequired = true
 * )
 * private String email;
 * }
 * </pre>
 * 
 * @author DBVCS Framework
 * @version 1.0
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface FieldMetadata {
    /**
     * Human-readable description of the field.
     * 
     * @return a descriptive string explaining the purpose and content of this field
     */
    String description();

    /**
     * Data type classification for the field.
     * Use constants from {@link FieldDataType} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the data type (e.g., {@link FieldDataType#STRING}, {@link FieldDataType#TIMESTAMP})
     * @see FieldDataType
     */
    String dataType() default "";

    /**
     * Business domain this field relates to.
     * Helps with data governance and organizational classification.
     * Defaults to empty string.
     * 
     * @return the business domain identifier
     */
    String domain() default "";

    /**
     * Data classification level indicating sensitivity and access restrictions.
     * Use constants from {@link DataClassification} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the classification level (e.g., {@link DataClassification#CONFIDENTIAL})
     * @see DataClassification
     */
    String classification() default "";

    /**
     * Indicates whether this field contains Personally Identifiable Information (PII).
     * When true, corresponding privacy and protection measures should be applied.
     * Defaults to false.
     * 
     * @return true if this field contains PII, false otherwise
     */
    boolean pii() default false;

    /**
     * Specifies the category of PII contained in this field.
     * Only relevant when {@code pii} is true.
     * Use constants from {@link PiiCategory} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the PII category (e.g., {@link PiiCategory#EMAIL}, {@link PiiCategory#SSN})
     * @see PiiCategory
     */
    String piiCategory() default "";

    /**
     * Encryption algorithm used to encrypt this field's data.
     * Use constants from {@link EncryptionType} for suggestions, or any custom string.
     * Defaults to empty string (no encryption specified).
     *
     * @return the encryption algorithm (e.g., {@link EncryptionType#AES256})
     * @see EncryptionType
     */
    String encryption() default "";

    /**
     * Specifies the searchable capability for this field.
     * Determines how efficiently queries can be executed against this field.
     * Use constants from {@link SearchStrategy} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the search capability (e.g., {@link SearchStrategy#FULL_TEXT}, {@link SearchStrategy#EXACT})
     * @see SearchStrategy
     */
    String searchable() default "";

    /**
     * Index strategy for database optimization.
     * Defines indexing approach for query performance.
     * Use constants from {@link IndexStrategy} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the index strategy (e.g., {@link IndexStrategy#UNIQUE}, {@link IndexStrategy#COMPOSITE})
     * @see IndexStrategy
     */
    String indexStrategy() default "";

    /**
     * Indicates whether this field is part of transactional data.
     * Transactional fields are typically subject to ACID guarantees.
     * Defaults to false.
     * 
     * @return true if field is transactional, false otherwise
     */
    boolean transactional() default false;

    /**
     * Indicates whether changes to this field are audited.
     * When enabled, all modifications are tracked for compliance and security purposes.
     * Defaults to false.
     * 
     * @return true if field changes are audited, false otherwise
     */
    boolean audited() default false;

    /**
     * Update strategy for concurrency control.
     * Specifies how concurrent updates to this field are handled.
     * Use constants from {@link UpdateStrategy} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the update strategy (e.g., {@link UpdateStrategy#OPTIMISTIC})
     * @see UpdateStrategy
     */
    String updateStrategy() default "";

    /**
     * Access level required to read or modify this field.
     * Used for fine-grained access control.
     * Use constants from {@link AccessLevel} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the access level (e.g., {@link AccessLevel#INTERNAL}, {@link AccessLevel#ADMIN_ONLY})
     * @see AccessLevel
     */
    String accessLevel() default "";

    /**
     * Indicates whether explicit user consent is required before accessing this field.
     * Particularly important for privacy-sensitive data.
     * Defaults to false.
     * 
     * @return true if consent is required, false otherwise
     */
    boolean consentRequired() default false;
}
