package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Unified annotation for describing an entity with comprehensive metadata.
 * Consolidates all entity-level descriptive and governance information.
 * 
 * <p>This annotation provides metadata for database entities including:
 * <ul>
 *   <li>Entity classification and domain organization</li>
 *   <li>Data governance (refresh frequency, retention, source system)</li>
 *   <li>Operational characteristics (criticality, auditability, versioning)</li>
 *   <li>Integration and API exposure</li>
 *   <li>Access control and compliance (classification, access level, consent)</li>
 * </ul>
 * 
 * <p>Example usage:
 * <pre>
 * {@code
 * @EntityMetadata(
 *     description = "Customer user accounts",
 *     domain = "CUSTOMER",
 *     type = "MASTER",
 *     classification = "CONFIDENTIAL",
 *     criticality = "HIGH",
 *     auditable = true,
 *     versioned = true,
 *     publicApi = true,
 *     accessLevel = "INTERNAL",
 *     consentRequired = true
 * )
 * @Entity
 * public class User {
 *     // fields...
 * }
 * }
 * </pre>
 * 
 * @author DBVCS Framework
 * @version 1.0
 * @see FieldDescription
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface EntityMetadata {
    /**
     * Human-readable description of the entity.
     * 
     * @return a descriptive string explaining the purpose and role of this entity
     */
    String description();

    /**
     * Business domain this entity belongs to.
     * Facilitates organizational classification and governance.
     * Defaults to empty string.
     * 
     * @return the business domain (e.g., "CUSTOMER", "ORDER")
     */
    String domain() default "";

    /**
     * Entity type classification within the data architecture.
     * Indicates the role and nature of the entity in the system.
     * Use constants from {@link EntityType} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the entity type (e.g., {@link EntityType#MASTER}, {@link EntityType#TRANSACTIONAL})
     * @see EntityType
     */
    String type() default "";

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
     * Data refresh frequency specification.
     * Indicates how often data in this entity is updated.
     * Use constants from {@link RefreshFrequency} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the refresh frequency (e.g., {@link RefreshFrequency#DAILY})
     * @see RefreshFrequency
     */
    String refreshFrequency() default "";

    /**
     * Source system or origin of the data in this entity.
     * Useful for multi-system integration scenarios.
     * Defaults to empty string.
     * 
     * @return the source system identifier (e.g., "SAP", "SALESFORCE", "LEGACY_ERP")
     */
    String sourceSystem() default "";

    /**
     * Criticality level of this entity for business operations.
     * Higher criticality may require stricter SLAs and availability guarantees.
     * Use constants from {@link CriticalityLevel} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the criticality level (e.g., {@link CriticalityLevel#HIGH})
     * @see CriticalityLevel
     */
    String criticality() default "";

    /**
     * Data retention policy for records in this entity.
     * Defines how long data is retained and when it can be archived or deleted.
     * Use constants from {@link DataRetentionPolicy} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the retention policy (e.g., {@link DataRetentionPolicy#PERMANENT})
     * @see DataRetentionPolicy
     */
    String retention() default "";

    /**
     * Indicates whether this entity supports change auditing.
     * When enabled, all create, update, and delete operations are tracked.
     * Defaults to false.
     * 
     * @return true if entity is auditable, false otherwise
     */
    boolean auditable() default false;

    /**
     * Indicates whether this entity maintains version history.
     * Versioned entities keep historical snapshots of data states.
     * Defaults to false.
     * 
     * @return true if entity is versioned, false otherwise
     */
    boolean versioned() default false;

    /**
     * Indicates whether this entity is exposed through public APIs.
     * Public API entities may have additional security and documentation requirements.
     * Defaults to false.
     * 
     * @return true if exposed via public APIs, false otherwise
     */
    boolean publicApi() default false;

    /**
     * Submodule or component name this entity belongs to.
     * Helps organize entities within larger applications.
     * Defaults to empty string.
     * 
     * @return the submodule identifier (e.g., "inventory", "billing")
     */
    String submodule() default "";

    /**
     * Integration context or external system this entity integrates with.
     * Identifies systems that consume or provide data for this entity.
     * Defaults to empty string.
     * 
     * @return the integration context identifier
     */
    String integration() default "";
    
    /**
     * Access level required to read or modify records in this entity.
     * Used for role-based access control at the entity level.
     * Use constants from {@link AccessLevel} for suggestions, or any custom string.
     * Defaults to empty string.
     *
     * @return the access level (e.g., {@link AccessLevel#INTERNAL})
     * @see AccessLevel
     */
    String accessLevel() default "";

    /**
     * Indicates whether explicit user consent is required before accessing records in this entity.
     * Important for compliance with privacy regulations.
     * Defaults to false.
     * 
     * @return true if consent is required, false otherwise
     */
    boolean consentRequired() default false;
}
