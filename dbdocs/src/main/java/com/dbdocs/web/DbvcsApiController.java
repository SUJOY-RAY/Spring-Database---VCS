package com.dbdocs.web;

import com.dbdocs.core.DbvcsService;
import com.dbdocs.model.EntitySchema;
import com.dbdocs.model.FieldSchema;
import com.dbdocs.model.RelationSchema;
import com.dbdocs.model.SchemaSnapshot;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * REST endpoints that back the dbdocs UI.
 *
 * <p>All paths are prefixed with {@code /dbdocs/api}.
 */
@RestController
@RequestMapping("/dbdocs/api")
public class DbvcsApiController {

    private final DbvcsService service;

    public DbvcsApiController(DbvcsService service) {
        this.service = service;
    }

    /** Returns a list of all saved version numbers. */
    @GetMapping("/versions")
    public ResponseEntity<Map<String, Object>> versions() {
        List<Integer> all = service.getStore().allVersions();
        int latest = all.isEmpty() ? 0 : all.get(all.size() - 1);
        return ResponseEntity.ok(Map.of("versions", all, "latest", latest));
    }

    /** Returns the schema snapshot for a specific version. */
    @GetMapping("/versions/{version}")
    public ResponseEntity<SchemaSnapshot> version(@PathVariable("version") int version) {
        SchemaSnapshot snapshot = service.getStore().load(version);
        if (snapshot == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(snapshot);
    }

    /** Returns the latest schema snapshot. */
    @GetMapping("/schema")
    public ResponseEntity<SchemaSnapshot> latestSchema() {
        SchemaSnapshot snap = service.getActiveSnapshot();
        if (snap == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(snap);
    }

    /**
     * Returns a full changelog: every version with its author, timestamp,
     * and a structured diff against the previous version.
     */
    @GetMapping("/changelog")
    public ResponseEntity<List<Map<String, Object>>> changelog() {
        List<Integer> versions = service.getStore().allVersions();
        List<Map<String, Object>> entries = new ArrayList<>();

        for (int i = versions.size() - 1; i >= 0; i--) {
            int ver = versions.get(i);
            SchemaSnapshot current = service.getStore().load(ver);
            SchemaSnapshot previous = (i > 0) ? service.getStore().load(versions.get(i - 1)) : null;

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("version", ver);
            entry.put("capturedAt", current.getCapturedAt());
            entry.put("capturedBy", current.getCapturedBy() != null ? current.getCapturedBy() : "unknown");
            entry.put("diff", buildDiff(previous, current));
            entries.add(entry);
        }

        return ResponseEntity.ok(entries);
    }

    // ── Diff helpers ──────────────────────────────────────────────────────────

    private Map<String, Object> buildDiff(SchemaSnapshot previous, SchemaSnapshot current) {
        Map<String, EntitySchema> prevMap = toMap(previous);
        Map<String, EntitySchema> currMap = toMap(current);

        List<Map<String, Object>> added    = new ArrayList<>();
        List<Map<String, Object>> removed  = new ArrayList<>();
        List<Map<String, Object>> modified = new ArrayList<>();

        // Added or modified
        for (Map.Entry<String, EntitySchema> e : currMap.entrySet()) {
            if (!prevMap.containsKey(e.getKey())) {
                added.add(entitySummary(e.getValue(), "added", List.of(), List.of(), List.of()));
            } else {
                EntitySchema prev = prevMap.get(e.getKey());
                List<String> fieldChanges    = diffFields(prev, e.getValue());
                List<String> relationChanges = diffRelations(prev, e.getValue());
                List<String> metadataChanges = diffMetadata(prev, e.getValue());
                if (!fieldChanges.isEmpty() || !relationChanges.isEmpty() || !metadataChanges.isEmpty()) {
                    modified.add(entitySummary(e.getValue(), "modified", fieldChanges, relationChanges, metadataChanges));
                }
            }
        }

        // Removed
        for (Map.Entry<String, EntitySchema> e : prevMap.entrySet()) {
            if (!currMap.containsKey(e.getKey())) {
                removed.add(entitySummary(e.getValue(), "removed", List.of(), List.of(), List.of()));
            }
        }

        Map<String, Object> diff = new LinkedHashMap<>();
        diff.put("added",    added);
        diff.put("removed",  removed);
        diff.put("modified", modified);
        diff.put("addedCount",    added.size());
        diff.put("removedCount",  removed.size());
        diff.put("modifiedCount", modified.size());
        return diff;
    }

    private Map<String, EntitySchema> toMap(SchemaSnapshot snap) {
        if (snap == null || snap.getEntities() == null) return Map.of();
        return snap.getEntities().stream()
                .collect(Collectors.toMap(EntitySchema::getClassName, e -> e));
    }

    private Map<String, Object> entitySummary(EntitySchema e, String status,
                                               List<String> fieldChanges,
                                               List<String> relationChanges,
                                               List<String> metadataChanges) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("className",       e.getClassName());
        m.put("simpleClassName", e.getSimpleClassName());
        m.put("tableName",       e.getTableName());
        m.put("status",          status);
        m.put("fieldChanges",    fieldChanges);
        m.put("relationChanges", relationChanges);
        m.put("metadataChanges", metadataChanges);
        return m;
    }

    private List<String> diffMetadata(EntitySchema prev, EntitySchema curr) {
        List<String> changes = new ArrayList<>();

        // Entity-level annotation changes
        Map<String, Object> prevMeta = prev.getMetadata() != null ? prev.getMetadata() : Map.of();
        Map<String, Object> currMeta = curr.getMetadata() != null ? curr.getMetadata() : Map.of();
        for (Map.Entry<String, Object> entry : currMeta.entrySet()) {
            String key     = entry.getKey();
            String currVal = String.valueOf(entry.getValue());
            if (!prevMeta.containsKey(key)) {
                changes.add("+ @" + key + ": " + currVal);
            } else {
                String prevVal = String.valueOf(prevMeta.get(key));
                if (!prevVal.equals(currVal)) {
                    changes.add("~ @" + key + ": " + prevVal + " → " + currVal);
                }
            }
        }
        for (String key : prevMeta.keySet()) {
            if (!currMeta.containsKey(key)) {
                changes.add("- @" + key + ": " + prevMeta.get(key));
            }
        }

        // Field-level annotation changes (only for fields that already existed)
        Map<String, FieldSchema> prevFields = fieldsMap(prev);
        Map<String, FieldSchema> currFields = fieldsMap(curr);
        for (Map.Entry<String, FieldSchema> entry : currFields.entrySet()) {
            String fieldName = entry.getKey();
            if (!prevFields.containsKey(fieldName)) continue;
            Map<String, Object> pf = prevFields.get(fieldName).getMetadata() != null
                    ? prevFields.get(fieldName).getMetadata() : Map.of();
            Map<String, Object> cf = entry.getValue().getMetadata() != null
                    ? entry.getValue().getMetadata() : Map.of();
            for (Map.Entry<String, Object> m : cf.entrySet()) {
                String key     = m.getKey();
                String currVal = String.valueOf(m.getValue());
                if (!pf.containsKey(key)) {
                    changes.add("+ " + fieldName + " @" + key + ": " + currVal);
                } else {
                    String prevVal = String.valueOf(pf.get(key));
                    if (!prevVal.equals(currVal)) {
                        changes.add("~ " + fieldName + " @" + key + ": " + prevVal + " → " + currVal);
                    }
                }
            }
            for (String key : pf.keySet()) {
                if (!cf.containsKey(key)) {
                    changes.add("- " + fieldName + " @" + key + ": " + pf.get(key));
                }
            }
        }

        return changes;
    }

    private List<String> diffFields(EntitySchema prev, EntitySchema curr) {
        List<String> changes = new ArrayList<>();
        Map<String, FieldSchema> prevFields = fieldsMap(prev);
        Map<String, FieldSchema> currFields = fieldsMap(curr);

        for (String name : currFields.keySet()) {
            if (!prevFields.containsKey(name)) {
                changes.add("+ field " + name);
            } else {
                FieldSchema pf = prevFields.get(name);
                FieldSchema cf = currFields.get(name);
                if (!Objects.equals(pf.getJavaType(), cf.getJavaType())) {
                    changes.add("~ field " + name + " type " + pf.getJavaType() + " → " + cf.getJavaType());
                }
                if (pf.isNullable() != cf.isNullable()) {
                    changes.add("~ field " + name + " nullable " + pf.isNullable() + " → " + cf.isNullable());
                }
            }
        }
        for (String name : prevFields.keySet()) {
            if (!currFields.containsKey(name)) changes.add("- field " + name);
        }
        return changes;
    }

    private List<String> diffRelations(EntitySchema prev, EntitySchema curr) {
        List<String> changes = new ArrayList<>();
        Map<String, RelationSchema> prevRels = relationsMap(prev);
        Map<String, RelationSchema> currRels = relationsMap(curr);

        for (String name : currRels.keySet()) {
            if (!prevRels.containsKey(name)) {
                RelationSchema r = currRels.get(name);
                changes.add("+ relation " + name + " (" + r.getType() + " → " + r.getTargetEntity() + ")");
            }
        }
        for (String name : prevRels.keySet()) {
            if (!currRels.containsKey(name)) {
                RelationSchema r = prevRels.get(name);
                changes.add("- relation " + name + " (" + r.getType() + " → " + r.getTargetEntity() + ")");
            }
        }
        return changes;
    }

    private Map<String, FieldSchema> fieldsMap(EntitySchema e) {
        if (e.getFields() == null) return Map.of();
        return e.getFields().stream().collect(Collectors.toMap(FieldSchema::getName, f -> f));
    }

    private Map<String, RelationSchema> relationsMap(EntitySchema e) {
        if (e.getRelations() == null) return Map.of();
        return e.getRelations().stream().collect(Collectors.toMap(RelationSchema::getFieldName, r -> r));
    }
}
