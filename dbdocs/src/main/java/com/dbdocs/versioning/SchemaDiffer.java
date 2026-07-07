package com.dbdocs.versioning;

import com.dbdocs.model.EntitySchema;
import com.dbdocs.model.FieldSchema;
import com.dbdocs.model.RelationSchema;
import com.dbdocs.model.SchemaSnapshot;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

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
     * don't cause false positives. Metadata annotations are included in the comparison.
     */
    private List<EntitySchema> normalize(List<EntitySchema> entities) {
        return entities.stream()
                .map(e -> {
                    List<FieldSchema> sortedFields = e.getFields() == null
                            ? List.of()
                            : e.getFields().stream()
                                .sorted(Comparator.comparing(FieldSchema::getName))
                                .toList();
                    List<RelationSchema> sortedRelations = e.getRelations() == null
                            ? List.of()
                            : e.getRelations().stream()
                                .sorted(Comparator.comparing(RelationSchema::getFieldName))
                                .toList();
                    EntitySchema normalized = new EntitySchema(
                            e.getClassName(),
                            e.getSimpleClassName(),
                            e.getTableName(),
                            e.getComment(),
                            sortedFields,
                            sortedRelations
                    );
                    normalized.setMetadata(e.getMetadata() != null ? e.getMetadata() : Map.of());
                    return normalized;
                })
                .sorted(Comparator.comparing(EntitySchema::getClassName))
                .toList();
    }
}
