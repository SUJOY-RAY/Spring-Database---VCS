package com.dbvcs.autoconfigure;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * DBVCS configuration properties.
 *
 * <p>Allows users to configure DBVCS behavior via application.properties or application.yml:
 *
 * <pre>{@code
 * dbvcs.enabled=true
 * dbvcs.validation.fail-on-violation=true
 * dbvcs.validation.fail-on-missing-annotations=false
 * dbvcs.scanning.enabled=true
 * dbvcs.scanning.packages=com.example.entity,com.example.model
 * dbvcs.api.enabled=true
 * dbvcs.api.base-path=/api/dbvcs
 * dbvcs.ui.enabled=true
 * dbvcs.ui.path=/dbvcs
 * dbvcs.versioning.enabled=false
 * dbvcs.changelog.enabled=true
 * }</pre>
 *
 * <h3>Property Hierarchy</h3>
 * <ul>
 *   <li>Java config bean (highest priority)</li>
 *   <li>application.properties / application.yml</li>
 *   <li>Defaults (lowest priority)</li>
 * </ul>
 */
@Component
@ConfigurationProperties(prefix = "dbvcs")
public class DbvcsProperties {

    /**
     * Enable/disable DBVCS completely. Default: true.
     */
    private boolean enabled = true;

    /**
     * Validation configuration.
     */
    private Validation validation = new Validation();

    /**
     * Entity scanning configuration.
     */
    private Scanning scanning = new Scanning();

    /**
     * API endpoint configuration.
     */
    private Api api = new Api();

    /**
     * UI configuration.
     */
    private Ui ui = new Ui();

    /**
     * Versioning and changelog configuration.
     */
    private Versioning versioning = new Versioning();

    /**
     * Changelog configuration.
     */
    private Changelog changelog = new Changelog();

    // ── Getters/Setters ──────────────────────────────────────────────────

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Validation getValidation() {
        return validation;
    }

    public void setValidation(Validation validation) {
        this.validation = validation;
    }

    public Scanning getScanning() {
        return scanning;
    }

    public void setScanning(Scanning scanning) {
        this.scanning = scanning;
    }

    public Api getApi() {
        return api;
    }

    public void setApi(Api api) {
        this.api = api;
    }

    public Ui getUi() {
        return ui;
    }

    public void setUi(Ui ui) {
        this.ui = ui;
    }

    public Versioning getVersioning() {
        return versioning;
    }

    public void setVersioning(Versioning versioning) {
        this.versioning = versioning;
    }

    public Changelog getChangelog() {
        return changelog;
    }

    public void setChangelog(Changelog changelog) {
        this.changelog = changelog;
    }

    // ── Nested Classes ───────────────────────────────────────────────────

    public static class Validation {
        /**
         * Fail application startup if validation violations are found. Default: false.
         */
        private boolean failOnViolation = false;

        /**
         * Enable validation. Default: true.
         */
        private boolean enabled = true;

        /**
         * Entity annotation attribute validation configuration.
         */
        private EntityAttributeValidation entity = new EntityAttributeValidation();

        /**
         * Field annotation attribute validation configuration.
         */
        private FieldAttributeValidation field = new FieldAttributeValidation();

        public boolean isFailOnViolation() { return failOnViolation; }
        public void setFailOnViolation(boolean failOnViolation) { this.failOnViolation = failOnViolation; }
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public EntityAttributeValidation getEntity() { return entity; }
        public void setEntity(EntityAttributeValidation entity) { this.entity = entity; }
        public FieldAttributeValidation getField() { return field; }
        public void setField(FieldAttributeValidation field) { this.field = field; }
    }

    /**
     * Controls which @EntityMetadata attributes are treated as mandatory.
     *
     * <p>Example:
     * <pre>{@code
     * dbvcs.validation.entity.required-attributes=domain,classification,criticality
     * dbvcs.validation.entity.optional-attributes=sourceSystem,integration
     * }</pre>
     */
    public static class EntityAttributeValidation {
        /**
         * Comma-separated list of @EntityMetadata attribute names that must be non-empty.
         * Example: domain,classification,criticality
         */
        private String requiredAttributes = "";

        /**
         * Comma-separated list of @EntityMetadata attribute names explicitly treated as optional.
         * Informational — has no runtime effect. Documents intent.
         */
        private String optionalAttributes = "";

        public String getRequiredAttributes() { return requiredAttributes; }
        public void setRequiredAttributes(String requiredAttributes) { this.requiredAttributes = requiredAttributes; }
        public String getOptionalAttributes() { return optionalAttributes; }
        public void setOptionalAttributes(String optionalAttributes) { this.optionalAttributes = optionalAttributes; }
    }

    /**
     * Controls which @FieldMetadata attributes are treated as mandatory.
     *
     * <p>Example:
     * <pre>{@code
     * dbvcs.validation.field.required-attributes=dataType,classification
     * dbvcs.validation.field.optional-attributes=encryption,searchable
     * }</pre>
     */
    public static class FieldAttributeValidation {
        /**
         * Comma-separated list of @FieldMetadata attribute names that must be non-empty.
         * Example: dataType,classification
         */
        private String requiredAttributes = "";

        /**
         * Comma-separated list of @FieldMetadata attribute names explicitly treated as optional.
         * Informational — has no runtime effect. Documents intent.
         */
        private String optionalAttributes = "";

        public String getRequiredAttributes() { return requiredAttributes; }
        public void setRequiredAttributes(String requiredAttributes) { this.requiredAttributes = requiredAttributes; }
        public String getOptionalAttributes() { return optionalAttributes; }
        public void setOptionalAttributes(String optionalAttributes) { this.optionalAttributes = optionalAttributes; }
    }

    public static class Scanning {
        /**
         * Enable entity scanning. Default: true.
         */
        private boolean enabled = true;

        /**
         * Comma-separated list of packages to scan for @Entity classes.
         * If empty, scans the entire classpath. Example: com.example.entity,com.example.model
         */
        private String packages = "";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getPackages() {
            return packages;
        }

        public void setPackages(String packages) {
            this.packages = packages;
        }
    }

    public static class Api {
        public Api() {}
    }

    public static class Ui {
        /**
         * URL path for DBVCS UI. Default: /dbvcs
         */
        private String path = "/dbvcs";

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }
    }

    public static class Versioning {
        /**
         * Enable schema versioning. Default: false.
         */
        private boolean enabled = false;

        /**
         * Directory for file-based version storage. Default: ./dbvcs-versions
         */
        private String storageDir = "./dbvcs-versions";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getStorageDir() {
            return storageDir;
        }

        public void setStorageDir(String storageDir) {
            this.storageDir = storageDir;
        }
    }

    public static class Changelog {
        /**
         * Enable changelog tracking. Default: true.
         */
        private boolean enabled = true;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
}
