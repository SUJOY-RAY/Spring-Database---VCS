package com.dbdocs.model;

import java.time.Instant;
import java.util.List;

/**
 * A complete versioned snapshot of all entity schemas captured at a point in time.
 */
public class SchemaSnapshot {

    private int version;
    private String capturedAt;
    private String capturedBy;
    private List<EntitySchema> entities;

    public SchemaSnapshot() {}

    public SchemaSnapshot(int version, String capturedBy, List<EntitySchema> entities) {
        this.version = version;
        this.capturedAt = Instant.now().toString();
        this.capturedBy = capturedBy;
        this.entities = entities;
    }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getCapturedAt() { return capturedAt; }
    public void setCapturedAt(String capturedAt) { this.capturedAt = capturedAt; }

    public String getCapturedBy() { return capturedBy; }
    public void setCapturedBy(String capturedBy) { this.capturedBy = capturedBy; }

    public List<EntitySchema> getEntities() { return entities; }
    public void setEntities(List<EntitySchema> entities) { this.entities = entities; }
}
