package com.dbvcs.versioning;

import com.dbvcs.model.EntitySchema;
import com.dbvcs.model.FieldSchema;
import com.dbvcs.model.RelationSchema;
import com.dbvcs.model.SchemaSnapshot;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

/**
 * Determines whether a newly scanned schema differs from the previously saved one.
 *
 * <p>Strategy: serialize both entity lists to canonical JSON and compare strings.
 * This is simple, reliable, and gives us a cheap equality check without having to
 * implement deep equals on every model class.
 */
public class SchemaDiffer {

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Returns {@code true} if the two snapshots represent different schemas.
     */
    public boolean hasChanged(SchemaSnapshot previous, List<EntitySchema> current) {
        if (previous == null) return true;
        try {
            String prev = mapper.writeValueAsString(normalize(previous.getEntities()));
            String curr = mapper.writeValueAsString(normalize(current));
            return !prev.equals(curr);
        } catch (JsonProcessingException e) {
            // treat as changed on serialization error
            return true;
        }
    }

    /**
     * Sorts entities, fields, and relations by name so that ordering differences
     * don't cause false positives.
     */
    private List<EntitySchema> normalize(List<EntitySchema> entities) {
        return entities.stream()
                .map(e -> {
                    List<FieldSchema> sortedFields = e.getFields() == null
                            ? List.of()
                            : e.getFields().stream()
                                .sorted((a, b) -> a.getName().compareTo(b.getName()))
                                .toList();
                    List<RelationSchema> sortedRelations = e.getRelations() == null
                            ? List.of()
                            : e.getRelations().stream()
                                .sorted((a, b) -> a.getFieldName().compareTo(b.getFieldName()))
                                .toList();
                    return new EntitySchema(
                            e.getClassName(),
                            e.getSimpleClassName(),
                            e.getTableName(),
                            sortedFields,
                            sortedRelations
                    );
                })
                .sorted((a, b) -> a.getClassName().compareTo(b.getClassName()))
                .toList();
    }
}
