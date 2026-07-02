package com.dbvcs.scanner;

import com.dbvcs.annotation.*;
import com.dbvcs.model.EntitySchema;
import com.dbvcs.model.FieldSchema;
import com.dbvcs.model.RelationSchema;
import jakarta.persistence.*;
import org.springframework.util.StringUtils;

import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.*;
import java.util.stream.Collectors;

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
        String comment   = clazz.isAnnotationPresent(DbvcsComment.class)
                ? clazz.getAnnotation(DbvcsComment.class).value()
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
        String comment    = field.isAnnotationPresent(DbvcsComment.class)
                ? field.getAnnotation(DbvcsComment.class).value()
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
     * Reads all dbvcs metadata annotations from an entity class and returns them
     * as a flat key/value map. Values are always Strings (or String arrays become
     * comma-joined). Absent annotations produce no entry.
     */
    private Map<String, Object> collectEntityMetadata(Class<?> clazz) {
        Map<String, Object> m = new LinkedHashMap<>();

        // Documentation
        ifPresent(clazz, Remarks.class,            a -> m.put("remarks",            a.value()));

        // Business
        ifPresent(clazz, BusinessModule.class,     a -> {
            m.put("module.name",        a.name());
            putIfNotEmpty(m, "module.description", a.description());
        });
        ifPresent(clazz, Submodule.class,          a -> {
            m.put("submodule.name",     a.name());
            putIfNotEmpty(m, "submodule.description", a.description());
        });
        ifPresent(clazz, Domain.class,             a -> {
            m.put("domain.name",        a.name());
            putIfNotEmpty(m, "domain.description", a.description());
        });
        ifPresent(clazz, Purpose.class,            a -> {
            m.put("purpose.value",      a.value());
            putIfNotEmpty(m, "purpose.description", a.description());
        });
        ifPresent(clazz, Criticality.class,        a -> {
            m.put("criticality.level",  a.level());
            putIfNotEmpty(m, "criticality.description", a.description());
        });

        // Ownership
        ifPresent(clazz, BusinessOwner.class,      a -> m.put("businessOwner",      a.value()));
        ifPresent(clazz, TechnicalOwner.class,     a -> m.put("technicalOwner",     a.value()));
        ifPresent(clazz, DataSteward.class,        a -> m.put("dataSteward",        a.value()));

        // Table metadata
        ifPresent(clazz, TableType.class,          a -> {
            m.put("tableType.type",     a.type());
            putIfNotEmpty(m, "tableType.description", a.description());
        });
        ifPresent(clazz, MasterData.class,         a -> m.put("masterData",         "true"));
        ifPresent(clazz, TransactionalData.class,  a -> m.put("transactionalData",  "true"));
        ifPresent(clazz, LookupTable.class,        a -> m.put("lookupTable",        "true"));
        ifPresent(clazz, ReferenceData.class,      a -> m.put("referenceData",      a.value()));

        // Integration
        ifPresent(clazz, SourceSystem.class,       a -> {
            m.put("sourceSystem.name",  a.name());
            putIfNotEmpty(m, "sourceSystem.description", a.description());
        });
        ifPresent(clazz, Integration.class,        a -> m.put("integration",        a.value()));
        ifPresent(clazz, DerivedFrom.class,        a -> m.put("derivedFrom",        a.value()));
        ifPresent(clazz, Derived.class,            a -> m.put("derived.expression", a.expression()));

        // Classification
        ifPresent(clazz, DataClassification.class, a -> {
            m.put("dataClassification.level", a.level());
            putIfNotEmpty(m, "dataClassification.description", a.description());
        });
        ifPresent(clazz, AccessLevel.class,        a -> m.put("accessLevel.level",  a.level()));

        // Privacy & Compliance
        ifPresent(clazz, Pii.class,                a -> m.put("pii",                a.value().isEmpty() ? "true" : a.value()));
        ifPresent(clazz, PiiCategory.class,        a -> {
            m.put("piiCategory.type",   a.type());
            putIfNotEmpty(m, "piiCategory.description", a.description());
        });
        ifPresent(clazz, Spd.class,                a -> m.put("spd",                a.value().isEmpty() ? "true" : a.value()));
        ifPresent(clazz, ContainsChildrenData.class, a -> m.put("containsChildrenData", a.value().isEmpty() ? "true" : a.value()));
        ifPresent(clazz, LawfulBasis.class,        a -> {
            m.put("lawfulBasis.type",   a.type());
            putIfNotEmpty(m, "lawfulBasis.description", a.description());
        });
        ifPresent(clazz, ConsentRequired.class,    a -> m.put("consentRequired",    a.value().isEmpty() ? "true" : a.value()));
        ifPresent(clazz, LegalHold.class,          a -> m.put("legalHold",          a.value().isEmpty() ? "true" : a.value()));

        // Security
        ifPresent(clazz, Encrypted.class,          a -> m.put("encrypted.algorithm", a.algorithm()));
        ifPresent(clazz, Masking.class,            a -> m.put("masking.strategy",   a.strategy()));

        // Lifecycle
        ifPresent(clazz, DataRetention.class, a -> {
            m.put("retention.type",     a.type());
            putIfNotEmpty(m, "retention.description", a.description());
        });
        ifPresent(clazz, Lifecycle.class,          a -> m.put("lifecycle",          a.value()));
        ifPresent(clazz, DeprecatedSince.class,    a -> {
            m.put("deprecatedSince.version",     a.version());
            putIfNotEmpty(m, "deprecatedSince.replacement", a.replacement());
        });

        // Operations
        ifPresent(clazz, RefreshFrequency.class,   a -> m.put("refreshFrequency",   a.value()));
        ifPresent(clazz, UpdateStrategy.class,     a -> m.put("updateStrategy",     a.value()));
        ifPresent(clazz, Versioned.class,          a -> m.put("versioned",          "true"));
        ifPresent(clazz, Auditable.class,          a -> m.put("auditable",          "true"));
        ifPresent(clazz, AuditColumns.class,       a -> {
            m.put("auditColumns.createdBy", a.createdBy());
            m.put("auditColumns.updatedBy", a.updatedBy());
            m.put("auditColumns.createdAt", a.createdAt());
            m.put("auditColumns.updatedAt", a.updatedAt());
        });

        // Data Quality
        ifPresent(clazz, DataQuality.class,        a -> m.put("dataQuality.rules",  String.join(", ", a.rules())));
        ifPresent(clazz, DataQualityLevel.class,   a -> m.put("dataQualityLevel",   a.level()));

        // API
        ifPresent(clazz, ApiExposed.class,         a -> m.put("apiExposed",         "true"));
        ifPresent(clazz, PublicApi.class,          a -> m.put("publicApi",          "true"));

        return m;
    }

    /**
     * Reads all dbvcs metadata annotations from a field and returns them
     * as a flat key/value map.
     */
    private Map<String, Object> collectFieldMetadata(Field field) {
        Map<String, Object> m = new LinkedHashMap<>();

        // Documentation
        ifFieldPresent(field, Remarks.class,            a -> m.put("remarks",            a.value()));

        // Integration
        ifFieldPresent(field, SourceSystem.class,       a -> {
            m.put("sourceSystem.name",  a.name());
            putIfNotEmpty(m, "sourceSystem.description", a.description());
        });
        ifFieldPresent(field, DerivedFrom.class,        a -> m.put("derivedFrom",        a.value()));
        ifFieldPresent(field, Derived.class,            a -> m.put("derived.expression", a.expression()));

        // Classification
        ifFieldPresent(field, DataClassification.class, a -> {
            m.put("dataClassification.level", a.level());
            putIfNotEmpty(m, "dataClassification.description", a.description());
        });
        ifFieldPresent(field, AccessLevel.class,        a -> m.put("accessLevel.level",  a.level()));

        // Privacy & Compliance
        ifFieldPresent(field, Pii.class,                a -> m.put("pii",                a.value().isEmpty() ? "true" : a.value()));
        ifFieldPresent(field, PiiCategory.class,        a -> {
            m.put("piiCategory.type",   a.type());
            putIfNotEmpty(m, "piiCategory.description", a.description());
        });
        ifFieldPresent(field, Spd.class,                a -> m.put("spd",                a.value().isEmpty() ? "true" : a.value()));
        ifFieldPresent(field, ContainsChildrenData.class, a -> m.put("containsChildrenData", a.value().isEmpty() ? "true" : a.value()));
        ifFieldPresent(field, LawfulBasis.class,        a -> {
            m.put("lawfulBasis.type",   a.type());
            putIfNotEmpty(m, "lawfulBasis.description", a.description());
        });
        ifFieldPresent(field, ConsentRequired.class,    a -> m.put("consentRequired",    a.value().isEmpty() ? "true" : a.value()));
        ifFieldPresent(field, LegalHold.class,          a -> m.put("legalHold",          a.value().isEmpty() ? "true" : a.value()));

        // Security
        ifFieldPresent(field, Encrypted.class,          a -> m.put("encrypted.algorithm", a.algorithm()));
        ifFieldPresent(field, Masking.class,            a -> m.put("masking.strategy",   a.strategy()));

        // Data Quality
        ifFieldPresent(field, DataQuality.class,        a -> m.put("dataQuality.rules",  String.join(", ", a.rules())));
        ifFieldPresent(field, DataQualityLevel.class,   a -> m.put("dataQualityLevel",   a.level()));

        // Data Modeling
        ifFieldPresent(field, BusinessKey.class,        a -> m.put("businessKey",        "true"));
        ifFieldPresent(field, NaturalKey.class,         a -> m.put("naturalKey",         "true"));
        ifFieldPresent(field, Searchable.class,         a -> m.put("searchable",         "true"));
        ifFieldPresent(field, IndexedFor.class,         a -> m.put("indexedFor.purpose", a.purpose()));

        // API
        ifFieldPresent(field, ApiExposed.class,         a -> m.put("apiExposed",         "true"));
        ifFieldPresent(field, PublicApi.class,          a -> m.put("publicApi",          "true"));

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
        schema.setModule(strVal(meta, "module.name"));
        schema.setSubmodule(strVal(meta, "submodule.name"));
        schema.setDomain(strVal(meta, "domain.name"));

        // Risk / quality
        schema.setCriticalityLevel(strVal(meta, "criticality.level"));
        schema.setLifecycleStage(strVal(meta, "lifecycle"));
        schema.setDataClassification(strVal(meta, "dataClassification.level"));

        // Deprecation flag
        schema.setDeprecated(meta.containsKey("deprecatedSince.version"));

        // Tags (order: privacy → security → table type → operations → api → status)
        List<String> tags = new ArrayList<>();

        // Privacy & compliance
        if (meta.containsKey("pii"))                  tags.add("PII");
        if (meta.containsKey("spd"))                  tags.add("SPD");
        if (meta.containsKey("containsChildrenData")) tags.add("Children Data");
        if (meta.containsKey("consentRequired"))      tags.add("Consent Required");
        if (meta.containsKey("legalHold"))            tags.add("Legal Hold");

        // Security
        if (meta.containsKey("encrypted.algorithm"))  tags.add("Encrypted");
        if (meta.containsKey("masking.strategy"))     tags.add("Masked");

        // Table type
        if (meta.containsKey("masterData"))           tags.add("Master Data");
        if (meta.containsKey("transactionalData"))    tags.add("Transactional");
        if (meta.containsKey("lookupTable"))          tags.add("Lookup");
        if (meta.containsKey("referenceData"))        tags.add("Reference Data");

        // Operations
        if (meta.containsKey("auditable"))            tags.add("Auditable");
        if (meta.containsKey("versioned"))            tags.add("Versioned");

        // API
        if (meta.containsKey("apiExposed"))           tags.add("API Exposed");
        if (meta.containsKey("publicApi"))            tags.add("Public API");

        // Status
        if (meta.containsKey("deprecatedSince.version")) tags.add("Deprecated");

        schema.setTags(tags);
    }

    private String strVal(Map<String, Object> meta, String key) {
        Object v = meta.get(key);
        return v != null ? String.valueOf(v) : null;
    }

    // -------------------------------------------------------------------------
    // Annotation helpers
    // -------------------------------------------------------------------------

    @FunctionalInterface
    private interface AnnotationConsumer<A> {
        void accept(A annotation);
    }

    private <A extends java.lang.annotation.Annotation> void ifPresent(
            Class<?> clazz, Class<A> annType, AnnotationConsumer<A> consumer) {
        if (clazz.isAnnotationPresent(annType)) {
            consumer.accept(clazz.getAnnotation(annType));
        }
    }

    private <A extends java.lang.annotation.Annotation> void ifFieldPresent(
            Field field, Class<A> annType, AnnotationConsumer<A> consumer) {
        if (field.isAnnotationPresent(annType)) {
            consumer.accept(field.getAnnotation(annType));
        }
    }

    private void putIfNotEmpty(Map<String, Object> map, String key, String value) {
        if (value != null && !value.isEmpty()) {
            map.put(key, value);
        }
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
}
