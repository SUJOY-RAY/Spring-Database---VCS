package com.dbdocs.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Represents the full schema of a single JPA entity, including all
 * dbdocs metadata annotations collected at startup.
 *
 * <p>In addition to the raw {@link #metadata} map (which contains every annotation
 * attribute as a flat key/value entry), a set of <em>promoted</em> top-level fields
 * surfaces the most commonly needed values so that the UI and tooling can access them
 * without parsing the map:
 *
 * <ul>
 *   <li>{@link #module}            — {@code @BusinessModule.name}</li>
 *   <li>{@link #submodule}         — {@code @Submodule.name}</li>
 *   <li>{@link #domain}            — {@code @Domain.name}</li>
 *   <li>{@link #criticalityLevel}  — {@code @Criticality.level}</li>
 *   <li>{@link #lifecycleStage}    — {@code @Lifecycle.value}</li>
 *   <li>{@link #dataClassification}— {@code @DataClassification.level}</li>
 *   <li>{@link #deprecated}        — {@code true} when {@code @DeprecatedSince} is present</li>
 *   <li>{@link #tags}              — collected boolean-flag annotations as human-readable strings</li>
 * </ul>
 */
public class EntitySchema {

    private String className;
    private String simpleClassName;
    private String tableName;
    private String comment;
    private List<FieldSchema> fields;
    private List<RelationSchema> relations;

    /**
     * Flat key/value map of every dbdocs metadata annotation present on the entity class.
     * Keys are annotation attribute paths (e.g. {@code "module.name"}, {@code "criticality.level"}).
     * Values are always strings (enum names, free text, comma-joined arrays).
     */
    private Map<String, Object> metadata = new LinkedHashMap<>();

    // ── Promoted top-level fields (derived from the metadata map at scan time) ──

    /**
     * Business module name from {@code @BusinessModule.name}.
     * Mirrors {@code metadata["module.name"]}. {@code null} when not annotated.
     */
    private String module;

    /**
     * Sub-module name from {@code @Submodule.name}.
     * Mirrors {@code metadata["submodule.name"]}. {@code null} when not annotated.
     */
    private String submodule;

    /**
     * Business domain name from {@code @Domain.name}.
     * Mirrors {@code metadata["domain.name"]}. {@code null} when not annotated.
     */
    private String domain;

    /**
     * Criticality level string from {@code @Criticality.level} (e.g. {@code "HIGH"}).
     * Mirrors {@code metadata["criticality.level"]}. {@code null} when not annotated.
     */
    private String criticalityLevel;

    /**
     * Lifecycle stage string from {@code @Lifecycle.value} (e.g. {@code "ACTIVE"}, {@code "DEPRECATED"}).
     * Mirrors {@code metadata["lifecycle"]}. {@code null} when not annotated.
     */
    private String lifecycleStage;

    /**
     * Data classification level from {@code @DataClassification.level}
     * (e.g. {@code "PUBLIC"}, {@code "CONFIDENTIAL"}).
     * Mirrors {@code metadata["dataClassification.level"]}. {@code null} when not annotated.
     */
    private String dataClassification;

    /**
     * {@code true} when the entity carries a {@code @DeprecatedSince} annotation.
     * Convenient shorthand so the UI can show a deprecation warning badge without
     * inspecting the metadata map.
     */
    private boolean deprecated;

    /**
     * Human-readable string tags derived from boolean/flag annotations on the entity class.
     * Each present flag annotation contributes one tag string, for example:
     * {@code ["PII", "Auditable", "Master Data", "Versioned", "API Exposed"]}.
     *
     * <p>Tags are populated by {@code EntityScanner} immediately after
     * {@link #setMetadata(Map)} is called so that the UI can render them as badge pills
     * in the page header and in the system-overview table without iterating over the
     * metadata map.
     *
     * <p>Tag strings are sourced from (in order of priority):
     * <ol>
     *   <li>Privacy &amp; compliance: {@code "PII"}, {@code "SPD"}, {@code "Children Data"},
     *       {@code "Consent Required"}, {@code "Legal Hold"}</li>
     *   <li>Security: {@code "Encrypted"}, {@code "Masked"}</li>
     *   <li>Table type: {@code "Master Data"}, {@code "Transactional"}, {@code "Lookup"},
     *       {@code "Reference Data"}</li>
     *   <li>Operations: {@code "Auditable"}, {@code "Versioned"}</li>
     *   <li>API: {@code "API Exposed"}, {@code "Public API"}</li>
     *   <li>Status: {@code "Deprecated"}</li>
     * </ol>
     */
    private List<String> tags = new ArrayList<>();

    // ── Constructors ──────────────────────────────────────────────────────────

    public EntitySchema() {}

    public EntitySchema(String className, String simpleClassName, String tableName,
                        List<FieldSchema> fields, List<RelationSchema> relations) {
        this.className = className;
        this.simpleClassName = simpleClassName;
        this.tableName = tableName;
        this.fields = fields;
        this.relations = relations;
    }

    public EntitySchema(String className, String simpleClassName, String tableName,
                        String comment, List<FieldSchema> fields, List<RelationSchema> relations) {
        this.className = className;
        this.simpleClassName = simpleClassName;
        this.tableName = tableName;
        this.comment = comment;
        this.fields = fields;
        this.relations = relations;
    }

    // ── Core field accessors ──────────────────────────────────────────────────

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getSimpleClassName() { return simpleClassName; }
    public void setSimpleClassName(String simpleClassName) { this.simpleClassName = simpleClassName; }

    public String getTableName() { return tableName; }
    public void setTableName(String tableName) { this.tableName = tableName; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public List<FieldSchema> getFields() { return fields; }
    public void setFields(List<FieldSchema> fields) { this.fields = fields; }

    public List<RelationSchema> getRelations() { return relations; }
    public void setRelations(List<RelationSchema> relations) { this.relations = relations; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    // ── Promoted field accessors ──────────────────────────────────────────────

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public String getSubmodule() { return submodule; }
    public void setSubmodule(String submodule) { this.submodule = submodule; }

    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }

    public String getCriticalityLevel() { return criticalityLevel; }
    public void setCriticalityLevel(String criticalityLevel) { this.criticalityLevel = criticalityLevel; }

    public String getLifecycleStage() { return lifecycleStage; }
    public void setLifecycleStage(String lifecycleStage) { this.lifecycleStage = lifecycleStage; }

    public String getDataClassification() { return dataClassification; }
    public void setDataClassification(String dataClassification) { this.dataClassification = dataClassification; }

    public boolean isDeprecated() { return deprecated; }
    public void setDeprecated(boolean deprecated) { this.deprecated = deprecated; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
