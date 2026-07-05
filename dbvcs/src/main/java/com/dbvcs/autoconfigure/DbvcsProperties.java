package com.dbvcs.autoconfigure;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

import java.util.Arrays;
import java.util.List;

/**
 * Configuration properties for dbvcs.
 *
 * <p>Example {@code application.properties}:
 * <pre>
 *   dbvcs.enabled=true
 *   dbvcs.output-dir=dbvcs-schemas
 *   dbvcs.base-packages=com.example.myapp
 *   dbvcs.ui-path=/dbvcs
 *   
 *   # Validation configuration
 *   dbvcs.validation.enabled=true
 *   dbvcs.validation.fail-on-violation=false
 *   dbvcs.validation.ignored-field-names=id,created_at,updated_at,created_by,updated_by,version
 * </pre>
 *
 * <p>All annotation vocabulary lists are configurable so that project teams
 * can define their own domain-specific values without modifying the library.
 * Example:
 * <pre>
 *   dbvcs.allowed-values.modules=ORDER,CUSTOMER,ECOMMERCE,HR
 *   dbvcs.allowed-values.domains=CUSTOMER,FINANCE,SUPPLY_CHAIN
 *   dbvcs.allowed-values.source-systems=SAP,SALESFORCE,LEGACY_CRM
 * </pre>
 */
@ConfigurationProperties(prefix = "dbvcs")
public class DbvcsProperties {

    /** Whether dbvcs is active. Default: true */
    private boolean enabled = true;

    /**
     * Directory (relative to working dir) where versioned JSON snapshots are written.
     * Default: dbvcs-schemas
     */
    private String outputDir = "dbvcs-schemas";

    /**
     * Comma-separated list of base packages to scan for @Entity classes.
     * If empty, the full classpath is scanned (slower).
     */
    private String basePackages = "";

    /**
     * URL path where the schema browser UI is served.
     * Default: /dbvcs
     */
    private String uiPath = "/dbvcs";

    /**
     * Configurable allowed-value lists for each annotation vocabulary.
     * Every list ships with sensible defaults and can be overridden per project.
     */
    @NestedConfigurationProperty
    private AllowedValues allowedValues = new AllowedValues();

    /**
     * Runtime validation rules for entity annotations.
     * Defines which annotations are required for which entities.
     */
    @NestedConfigurationProperty
    private ValidationRules validation = new ValidationRules();

    // -------------------------------------------------------------------------
    // Getters / setters
    // -------------------------------------------------------------------------

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getOutputDir() { return outputDir; }
    public void setOutputDir(String outputDir) { this.outputDir = outputDir; }

    public String getBasePackages() { return basePackages; }
    public void setBasePackages(String basePackages) { this.basePackages = basePackages; }

    public String getUiPath() { return uiPath; }
    public void setUiPath(String uiPath) { this.uiPath = uiPath; }

    public AllowedValues getAllowedValues() { return allowedValues; }
    public void setAllowedValues(AllowedValues allowedValues) { this.allowedValues = allowedValues; }

    public ValidationRules getValidation() { return validation; }
    public void setValidation(ValidationRules validation) { this.validation = validation; }

    // =========================================================================
    // Nested: AllowedValues
    // =========================================================================

    /**
     * Holds the project-configurable vocabulary lists for every annotation
     * whose attribute type was previously a hard-coded enum.
     *
     * <p>All lists ship with the library's built-in defaults.
     * Override any list in {@code application.properties} / {@code application.yml}.
     */
    public static class AllowedValues {

        // ----- Business -----

        /** @BusinessModule(name) */
        private List<String> modules = Arrays.asList(
                "ORDER", "CUSTOMER", "PRODUCT", "INVENTORY", "PAYMENT",
                "FINANCE", "SHIPPING", "NOTIFICATION", "AUTH", "REPORTING", "ADMIN", "OTHER"
        );

        /** @Domain(name) */
        private List<String> domains = Arrays.asList(
                "CUSTOMER", "FINANCE", "PAYMENTS", "ORDERS", "INVENTORY",
                "LOGISTICS", "COMPLIANCE", "SECURITY", "ANALYTICS", "OTHER"
        );

        /** @Criticality(level) */
        private List<String> criticalityLevels = Arrays.asList(
                "LOW", "MEDIUM", "HIGH", "CRITICAL"
        );

        // ----- Table metadata -----

        /** @TableType(type) */
        private List<String> tableTypes = Arrays.asList(
                "MASTER", "TRANSACTIONAL", "LOOKUP", "CONFIGURATION",
                "STAGING", "AUDIT", "HISTORY", "TEMPORARY"
        );

        // ----- Integration -----

        /** @SourceSystem(name) */
        private List<String> sourceSystems = Arrays.asList(
                "CRM", "ERP", "SAP", "SALESFORCE", "INTERNAL", "MANUAL", "API", "ETL", "LEGACY", "OTHER"
        );

        // ----- Classification -----

        /** @DataClassification(level) */
        private List<String> dataClassificationLevels = Arrays.asList(
                "PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"
        );

        /** @AccessLevel(level) */
        private List<String> accessLevels = Arrays.asList(
                "PUBLIC", "INTERNAL_ONLY", "RESTRICTED", "ADMIN_ONLY"
        );

        // ----- Privacy & Compliance -----

        /** @PiiCategory(type) */
        private List<String> piiTypes = Arrays.asList(
                "NAME", "EMAIL", "PHONE", "ADDRESS", "DATE_OF_BIRTH", "NATIONAL_ID",
                "PASSPORT", "SSN", "IP_ADDRESS", "DEVICE_ID", "BIOMETRIC", "FINANCIAL", "HEALTH", "OTHER"
        );

        /** @LawfulBasis(type) */
        private List<String> lawfulBasisTypes = Arrays.asList(
                "CONSENT", "CONTRACT", "LEGAL_OBLIGATION", "VITAL_INTERESTS",
                "PUBLIC_TASK", "LEGITIMATE_INTERESTS"
        );

        // ----- Security -----

        /** @Encrypted(algorithm) */
        private List<String> encryptionTypes = Arrays.asList(
                "AES128", "AES256", "RSA", "BCRYPT", "ARGON2", "OTHER"
        );

        /** @Masking(strategy) */
        private List<String> maskingStrategies = Arrays.asList(
                "FULL", "PARTIAL", "HASH", "TOKENIZE"
        );

        // ----- Lifecycle -----

        /** @DataRetention(type) */
        private List<String> retentionTypes = Arrays.asList(
                "ONE_YEAR", "THREE_YEARS", "FIVE_YEARS", "SEVEN_YEARS", "TEN_YEARS",
                "INDEFINITE", "UNTIL_CONSENT_WITHDRAWN", "CUSTOM"
        );

        /** @Lifecycle(value) */
        private List<String> lifecycleStages = Arrays.asList(
                "ACTIVE", "DEPRECATED", "ARCHIVED", "LEGACY"
        );

        // ----- Operations -----

        /** @RefreshFrequency(value) */
        private List<String> frequencies = Arrays.asList(
                "REALTIME", "HOURLY", "DAILY", "WEEKLY", "MONTHLY"
        );

        /** @UpdateStrategy(value) */
        private List<String> updateTypes = Arrays.asList(
                "APPEND_ONLY", "UPSERT", "FULL_REFRESH", "EVENT_DRIVEN"
        );

        // ----- Data Quality -----

        /** @DataQualityLevel(level) */
        private List<String> qualityLevels = Arrays.asList(
                "LOW", "MEDIUM", "HIGH", "VERIFIED"
        );

        // -------------------------------------------------------------------------
        // Getters / setters
        // -------------------------------------------------------------------------

        public List<String> getModules() { return modules; }
        public void setModules(List<String> modules) { this.modules = modules; }

        public List<String> getDomains() { return domains; }
        public void setDomains(List<String> domains) { this.domains = domains; }

        public List<String> getCriticalityLevels() { return criticalityLevels; }
        public void setCriticalityLevels(List<String> criticalityLevels) { this.criticalityLevels = criticalityLevels; }

        public List<String> getTableTypes() { return tableTypes; }
        public void setTableTypes(List<String> tableTypes) { this.tableTypes = tableTypes; }

        public List<String> getSourceSystems() { return sourceSystems; }
        public void setSourceSystems(List<String> sourceSystems) { this.sourceSystems = sourceSystems; }

        public List<String> getDataClassificationLevels() { return dataClassificationLevels; }
        public void setDataClassificationLevels(List<String> dataClassificationLevels) { this.dataClassificationLevels = dataClassificationLevels; }

        public List<String> getAccessLevels() { return accessLevels; }
        public void setAccessLevels(List<String> accessLevels) { this.accessLevels = accessLevels; }

        public List<String> getPiiTypes() { return piiTypes; }
        public void setPiiTypes(List<String> piiTypes) { this.piiTypes = piiTypes; }

        public List<String> getLawfulBasisTypes() { return lawfulBasisTypes; }
        public void setLawfulBasisTypes(List<String> lawfulBasisTypes) { this.lawfulBasisTypes = lawfulBasisTypes; }

        public List<String> getEncryptionTypes() { return encryptionTypes; }
        public void setEncryptionTypes(List<String> encryptionTypes) { this.encryptionTypes = encryptionTypes; }

        public List<String> getMaskingStrategies() { return maskingStrategies; }
        public void setMaskingStrategies(List<String> maskingStrategies) { this.maskingStrategies = maskingStrategies; }

        public List<String> getRetentionTypes() { return retentionTypes; }
        public void setRetentionTypes(List<String> retentionTypes) { this.retentionTypes = retentionTypes; }

        public List<String> getLifecycleStages() { return lifecycleStages; }
        public void setLifecycleStages(List<String> lifecycleStages) { this.lifecycleStages = lifecycleStages; }

        public List<String> getFrequencies() { return frequencies; }
        public void setFrequencies(List<String> frequencies) { this.frequencies = frequencies; }

        public List<String> getUpdateTypes() { return updateTypes; }
        public void setUpdateTypes(List<String> updateTypes) { this.updateTypes = updateTypes; }

        public List<String> getQualityLevels() { return qualityLevels; }
        public void setQualityLevels(List<String> qualityLevels) { this.qualityLevels = qualityLevels; }
    }

    // =========================================================================
    // Nested: ValidationRules
    // =========================================================================

    /**
     * Runtime validation rules that define which annotations must be present
     * on entity classes. Unlike the compile-time {@code @RequiredAnnotations},
     * this validates all {@code @Entity} classes at application startup.
     *
     * <p>Example {@code application.properties}:
     * <pre>
     *   # Enable validation
     *   dbvcs.validation.enabled=true
     *   
     *   # Fail startup if violations found
     *   dbvcs.validation.fail-on-violation=true
     *   
     *   # Require these annotations on all entities
     *   dbvcs.validation.required-annotations=Domain,BusinessModule,DataClassification,Lifecycle
     *   
     *   # Ignore common audit/system fields from validation
     *   dbvcs.validation.ignored-field-names=id,created_at,updated_at,created_by,updated_by,version
     *   
     *   # Or define per-package rules
     *   dbvcs.validation.rules[0].package-pattern=com.example.customer.*
     *   dbvcs.validation.rules[0].required-annotations=Domain,Purpose,DataClassification,Pii
     *   
     *   dbvcs.validation.rules[1].package-pattern=com.example.product.*
     *   dbvcs.validation.rules[1].required-annotations=Domain,BusinessModule,Lifecycle
     * </pre>
     */
    public static class ValidationRules {

        /** Whether to enable runtime annotation validation. Default: false */
        private boolean enabled = false;

        /** Whether to fail application startup on validation violations. Default: false (warns only) */
        private boolean failOnViolation = false;

        /**
         * Global list of required annotation simple names (e.g., "Domain", "BusinessModule").
         * Applies to all entities unless overridden by package-specific rules.
         */
        private List<String> requiredAnnotations = List.of();

        /**
         * Field names to ignore during validation (e.g., common audit fields).
         * These fields will not be checked for required annotations.
         * Default includes common audit/system fields.
         */
        private List<String> ignoredFieldNames = Arrays.asList(
                "id", "created_at", "updated_at", "created_by", "updated_by", 
                "version", "createdAt", "updatedAt", "createdBy", "updatedBy"
        );

        /**
         * Package-specific validation rules. Each rule defines a package pattern
         * and the annotations required for entities in that package.
         */
        private List<PackageRule> rules = List.of();

        // -------------------------------------------------------------------------
        // Getters / setters
        // -------------------------------------------------------------------------

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }

        public boolean isFailOnViolation() { return failOnViolation; }
        public void setFailOnViolation(boolean failOnViolation) { this.failOnViolation = failOnViolation; }

        public List<String> getRequiredAnnotations() { return requiredAnnotations; }
        public void setRequiredAnnotations(List<String> requiredAnnotations) {
            this.requiredAnnotations = requiredAnnotations;
        }

        public List<String> getIgnoredFieldNames() { return ignoredFieldNames; }
        public void setIgnoredFieldNames(List<String> ignoredFieldNames) {
            this.ignoredFieldNames = ignoredFieldNames;
        }

        public List<PackageRule> getRules() { return rules; }
        public void setRules(List<PackageRule> rules) { this.rules = rules; }

        /**
         * A package-specific validation rule.
         */
        public static class PackageRule {
            /** Package pattern (supports wildcards: com.example.* or com.example.**) */
            private String packagePattern;

            /** Required annotation simple names for entities in this package */
            private List<String> requiredAnnotations = List.of();

            public String getPackagePattern() { return packagePattern; }
            public void setPackagePattern(String packagePattern) { this.packagePattern = packagePattern; }

            public List<String> getRequiredAnnotations() { return requiredAnnotations; }
            public void setRequiredAnnotations(List<String> requiredAnnotations) {
                this.requiredAnnotations = requiredAnnotations;
            }
        }
    }
}
