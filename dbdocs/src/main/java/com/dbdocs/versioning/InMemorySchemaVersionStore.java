package com.dbdocs.versioning;

import com.dbdocs.model.SchemaSnapshot;

import java.util.*;

/**
 * In-memory implementation of schema version storage.
 *
 * <p>Used when versioning is disabled or file system access is not available.
 * Stores only the current schema snapshot in memory.
 */
public class InMemorySchemaVersionStore extends SchemaVersionStore {

    private final Map<Integer, SchemaSnapshot> snapshots = new LinkedHashMap<>();
    private int version = 0;

    public InMemorySchemaVersionStore() {
        super("");  // Pass empty path to parent
    }

    @Override
    public void init() {
        // No-op for in-memory store
    }

    @Override
    public int latestVersion() {
        return version;
    }

    @Override
    public SchemaSnapshot load(int version) {
        return snapshots.get(version);
    }

    @Override
    public void save(SchemaSnapshot snapshot) {
        snapshots.put(snapshot.getVersion(), snapshot);
        version = Math.max(version, snapshot.getVersion());
    }

    @Override
    public List<Integer> allVersions() {
        return new ArrayList<>(snapshots.keySet());
    }
}
