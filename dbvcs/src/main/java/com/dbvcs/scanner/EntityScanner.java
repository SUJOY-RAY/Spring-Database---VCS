package com.dbvcs.scanner;

import com.dbvcs.annotation.EntityMetadata;
import com.dbvcs.annotation.FieldMetadata;
import com.dbvcs.model.EntitySchema;
import com.dbvcs.model.FieldSchema;
import com.dbvcs.model.RelationSchema;
import jakarta.persistence.*;
import org.springframework.util.StringUtils;

import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.*;

/**
 * Scans a set of classes for JPA {@link Entity} annotations and extracts
 * their field and relationship metadata, including all dbvcs metadata annotations.
 */
public class EntityScanner {

    /**
     * Given a set of fully-qualified class names, loads each one and extracts
     * an {@link EntitySchema} for every class annotated with {@link Entity}.
     */
    public List<EntitySchema> scan(Set<String> classNames, ClassLoader classLoader) {
        List<EntitySchema> result = new ArrayList<>();

        for (String className : classNames) {
            try {
                Class<?> clazz = classLoader.loadClass(className);
                if (!clazz.isAnnotationPresent(Entity.class)) {
                    continue;
                }
                result.add(buildEntitySchema(clazz));
            } catch (Throwable ignored) {
                // Skip classes that can't be loaded (wrong JVM version, missing deps, etc.)
            }
        }

        result.sort(Comparator.comparing(EntitySchema::getSimpleClassName));
        return result;
    }

    private EntitySchema buildEntitySchema(Class<?> clazz) {
        String tableName = resolveTableName(clazz);
        String comment   = clazz.isAnnotationPresent(EntityMetadata.class)
                ? clazz.getAnnotation(EntityMetadata.class).description()
                : null;
        List<FieldSchema>    fields    = new ArrayList<>();
        List<RelationSchema> relations = new ArrayList<>();

        for (Field field : getAllFields(clazz)) {
            field.setAccessible(true);

            if (isRelationField(field)) {
                relations.add(buildRelationSchema(field));
            } else if (!isTransient(field)) {
                fields.add(buildFieldSchema(field));
            }
        }

        EntitySchema schema = new EntitySchema(
                clazz.getName(),
                clazz.getSimpleName(),
                tableName,
                comment,
                fields,
                relations
        );
        Map<String, Object> meta = collectEntityMetadata(clazz);
        schema.setMetadata(meta);
        populatePromotedFields(schema, meta);
        return schema;
    }

    // -------------------------------------------------------------------------
    // Field helpers
    // -------------------------------------------------------------------------

    private FieldSchema buildFieldSchema(Field field) {
        String columnName = resolveColumnName(field);
        boolean isId      = field.isAnnotationPresent(Id.class);
        boolean nullable  = resolveNullable(field, isId);
        String javaType   = field.getType().getSimpleName();
        String comment    = field.isAnnotationPresent(FieldMetadata.class)
                ? field.getAnnotation(FieldMetadata.class).description()
                : null;

        FieldSchema schema = new FieldSchema(field.getName(), javaType, nullable, isId, columnName, comment);
        schema.setMetadata(collectFieldMetadata(field));
        return schema;
    }

    private RelationSchema buildRelationSchema(Field field) {
        RelationSchema.RelationType type;
        String mappedBy = null;
        boolean optional = true;
        Class<?> target = null;

        if (field.isAnnotationPresent(OneToOne.class)) {
            OneToOne ann = field.getAnnotation(OneToOne.class);
            type = RelationSchema.RelationType.ONE_TO_ONE;
            mappedBy = ann.mappedBy().isEmpty() ? null : ann.mappedBy();
            optional = ann.optional();
            target = resolveTarget(ann.targetEntity(), field);
        } else if (field.isAnnotationPresent(OneToMany.class)) {
            OneToMany ann = field.getAnnotation(OneToMany.class);
            type = RelationSchema.RelationType.ONE_TO_MANY;
            mappedBy = ann.mappedBy().isEmpty() ? null : ann.mappedBy();
            optional = true;
            target = resolveTargetFromCollection(ann.targetEntity(), field);
        } else if (field.isAnnotationPresent(ManyToOne.class)) {
            ManyToOne ann = field.getAnnotation(ManyToOne.class);
            type = RelationSchema.RelationType.MANY_TO_ONE;
            optional = ann.optional();
            target = resolveTarget(ann.targetEntity(), field);
        } else {
            ManyToMany ann = field.getAnnotation(ManyToMany.class);
            type = RelationSchema.RelationType.MANY_TO_MANY;
            mappedBy = ann.mappedBy().isEmpty() ? null : ann.mappedBy();
            optional = true;
            target = resolveTargetFromCollection(ann.targetEntity(), field);
        }

        String targetName = (target != null && target != void.class)
                ? target.getSimpleName()
                : "Unknown";

        // Resolve physical join column name for owning-side relations
        String joinColumnName = null;
        if (mappedBy == null && (type == RelationSchema.RelationType.MANY_TO_ONE
                || type == RelationSchema.RelationType.ONE_TO_ONE)) {
            if (field.isAnnotationPresent(JoinColumn.class)) {
                String jcName = field.getAnnotation(JoinColumn.class).name();
                joinColumnName = jcName.isEmpty() ? toSnakeCase(field.getName()) + "_id" : jcName;
            } else {
                joinColumnName = toSnakeCase(field.getName()) + "_id";
            }
        }

        return new RelationSchema(field.getName(), type, targetName, mappedBy, optional, joinColumnName);
    }

    // -------------------------------------------------------------------------
    // Metadata collectors
    // -------------------------------------------------------------------------

    /**
     * Reads all dbvcs metadata from EntityMetadata annotation on an entity class
     * and returns them as a flat key/value map.
     */
    private Map<String, Object> collectEntityMetadata(Class<?> clazz) {
        Map<String, Object> m = new LinkedHashMap<>();

        if (!clazz.isAnnotationPresent(EntityMetadata.class)) {
            return m;
        }

        EntityMetadata desc = clazz.getAnnotation(EntityMetadata.class);

        // Core metadata
        putIfNotEmpty(m, "description", desc.description());
        putIfNotEmpty(m, "domain", desc.domain());
        putIfNotEmpty(m, "type", desc.type());
        putIfNotEmpty(m, "classification", desc.classification());
        putIfNotEmpty(m, "refreshFrequency", desc.refreshFrequency());
        putIfNotEmpty(m, "sourceSystem", desc.sourceSystem());
        putIfNotEmpty(m, "criticality", desc.criticality());
        putIfNotEmpty(m, "retention", desc.retention());
        
        // Boolean flags
        if (desc.auditable()) m.put("auditable", "true");
        if (desc.versioned()) m.put("versioned", "true");
        if (desc.publicApi()) m.put("publicApi", "true");
        
        putIfNotEmpty(m, "submodule", desc.submodule());
        putIfNotEmpty(m, "integration", desc.integration());
        putIfNotEmpty(m, "accessLevel", desc.accessLevel());
        if (desc.consentRequired()) m.put("consentRequired", "true");

        return m;
    }

    /**
     * Reads all dbvcs metadata from FieldMetadata annotation on a field
     * and returns them as a flat key/value map.
     */
    private Map<String, Object> collectFieldMetadata(Field field) {
        Map<String, Object> m = new LinkedHashMap<>();

        if (!field.isAnnotationPresent(FieldMetadata.class)) {
            return m;
        }

        FieldMetadata desc = field.getAnnotation(FieldMetadata.class);

        // Core metadata
        putIfNotEmpty(m, "description", desc.description());
        putIfNotEmpty(m, "dataType", desc.dataType());
        putIfNotEmpty(m, "domain", desc.domain());
        putIfNotEmpty(m, "classification", desc.classification());

        // PII
        if (desc.pii()) {
            m.put("pii", "true");
            putIfNotEmpty(m, "piiCategory", desc.piiCategory());
        }

        // Security
        putIfNotEmpty(m, "encryption", desc.encryption());

        // Data modeling
        putIfNotEmpty(m, "searchable", desc.searchable());
        putIfNotEmpty(m, "indexStrategy", desc.indexStrategy());

        // Flags
        if (desc.transactional()) m.put("transactional", "true");
        if (desc.audited()) m.put("audited", "true");

        putIfNotEmpty(m, "updateStrategy", desc.updateStrategy());
        putIfNotEmpty(m, "accessLevel", desc.accessLevel());
        if (desc.consentRequired()) m.put("consentRequired", "true");

        return m;
    }

    // -------------------------------------------------------------------------
    // Promoted field population
    // -------------------------------------------------------------------------

    /**
     * Reads the already-collected {@code metadata} map and copies the most important
     * values into the dedicated top-level fields on {@link EntitySchema}, so that the
     * UI and external tooling can access them without parsing the flat map.
     *
     * <p>Also builds the {@code tags} list from boolean-flag annotations so that the
     * Wiki page header and system overview table can render badge pills directly.
     */
    private void populatePromotedFields(EntitySchema schema, Map<String, Object> meta) {
        // Grouping / ownership
        schema.setSubmodule(strVal(meta, "submodule"));
        schema.setDomain(strVal(meta, "domain"));

        // Risk / quality
        schema.setCriticalityLevel(strVal(meta, "criticality"));
        schema.setDataClassification(strVal(meta, "classification"));

        // Tags (order: privacy → security → operations → api → status)
        List<String> tags = new ArrayList<>();

        // Privacy & compliance
        if (meta.containsKey("pii")) tags.add("PII");
        if (meta.containsKey("consentRequired")) tags.add("Consent Required");

        // Security
        if (meta.containsKey("encryption")) tags.add("Encrypted");

        // Operations
        if (meta.containsKey("auditable")) tags.add("Auditable");
        if (meta.containsKey("versioned")) tags.add("Versioned");

        // API
        if (meta.containsKey("publicApi")) tags.add("Public API");

        schema.setTags(tags);
    }

    private String strVal(Map<String, Object> meta, String key) {
        Object v = meta.get(key);
        return v != null ? String.valueOf(v) : null;
    }

    // -------------------------------------------------------------------------
    // Utility helpers
    // -------------------------------------------------------------------------

    private boolean isRelationField(Field field) {
        return field.isAnnotationPresent(OneToOne.class)
                || field.isAnnotationPresent(OneToMany.class)
                || field.isAnnotationPresent(ManyToOne.class)
                || field.isAnnotationPresent(ManyToMany.class);
    }

    private boolean isTransient(Field field) {
        return field.isAnnotationPresent(Transient.class)
                || java.lang.reflect.Modifier.isTransient(field.getModifiers());
    }

    private String resolveTableName(Class<?> clazz) {
        if (clazz.isAnnotationPresent(Table.class)) {
            String name = clazz.getAnnotation(Table.class).name();
            if (StringUtils.hasText(name)) return name;
        }
        return toSnakeCase(clazz.getSimpleName());
    }

    private String resolveColumnName(Field field) {
        if (field.isAnnotationPresent(Column.class)) {
            String name = field.getAnnotation(Column.class).name();
            if (StringUtils.hasText(name)) return name;
        }
        if (field.isAnnotationPresent(JoinColumn.class)) {
            String name = field.getAnnotation(JoinColumn.class).name();
            if (StringUtils.hasText(name)) return name;
        }
        return toSnakeCase(field.getName());
    }

    private boolean resolveNullable(Field field, boolean isId) {
        if (isId) return false;
        if (field.isAnnotationPresent(Column.class)) {
            return field.getAnnotation(Column.class).nullable();
        }
        return true;
    }

    private Class<?> resolveTarget(Class<?> annotationTarget, Field field) {
        if (annotationTarget != null && annotationTarget != void.class) return annotationTarget;
        return field.getType();
    }

    private Class<?> resolveTargetFromCollection(Class<?> annotationTarget, Field field) {
        if (annotationTarget != null && annotationTarget != void.class) return annotationTarget;
        Type genericType = field.getGenericType();
        if (genericType instanceof ParameterizedType pt) {
            Type[] args = pt.getActualTypeArguments();
            if (args.length > 0 && args[0] instanceof Class<?> c) {
                return c;
            }
        }
        return null;
    }

    /** Walks the class hierarchy to collect all declared fields. */
    private List<Field> getAllFields(Class<?> clazz) {
        List<Field> fields = new ArrayList<>();
        Class<?> current = clazz;
        while (current != null && current != Object.class) {
            fields.addAll(Arrays.asList(current.getDeclaredFields()));
            current = current.getSuperclass();
        }
        return fields;
    }

    private String toSnakeCase(String name) {
        return name.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
    }

    private void putIfNotEmpty(Map<String, Object> map, String key, String value) {
        if (value != null && !value.isEmpty()) {
            map.put(key, value);
        }
    }
}
