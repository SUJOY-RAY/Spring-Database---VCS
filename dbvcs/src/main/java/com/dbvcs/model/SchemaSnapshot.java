package com.dbvcs.model;

import java.time.Instant;
import java.util.List;

/**
 * A complete versioned snapshot of all entity schemas captured at a point in time.
 */
public class SchemaSnapshot {

    private int version;
    private String capturedAt;
    private List<EntitySchema> entities;

    public SchemaSnapshot() {}

    public SchemaSnapshot(int version, List<EntitySchema> entities) {
        this.version = version;
        this.capturedAt = Instant.now().toString();
        this.entities = entities;
    }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getCapturedAt() { return capturedAt; }
    public void setCapturedAt(String capturedAt) { this.capturedAt = capturedAt; }

    public List<EntitySchema> getEntities() { return entities; }
    public void setEntities(List<EntitySchema> entities) { this.entities = entities; }
}
