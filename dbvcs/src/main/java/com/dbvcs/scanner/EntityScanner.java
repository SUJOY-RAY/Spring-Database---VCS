package com.dbvcs.scanner;

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
 * their field and relationship metadata.
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
        List<FieldSchema> fields = new ArrayList<>();
        List<RelationSchema> relations = new ArrayList<>();

        for (Field field : getAllFields(clazz)) {
            field.setAccessible(true);

            if (isRelationField(field)) {
                relations.add(buildRelationSchema(field));
            } else if (!isTransient(field)) {
                fields.add(buildFieldSchema(field));
            }
        }

        return new EntitySchema(
                clazz.getName(),
                clazz.getSimpleName(),
                tableName,
                fields,
                relations
        );
    }

    // -------------------------------------------------------------------------
    // Field helpers
    // -------------------------------------------------------------------------

    private FieldSchema buildFieldSchema(Field field) {
        String columnName = resolveColumnName(field);
        boolean isId = field.isAnnotationPresent(Id.class);
        boolean nullable = resolveNullable(field, isId);
        String javaType = field.getType().getSimpleName();

        return new FieldSchema(field.getName(), javaType, nullable, isId, columnName);
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
            optional = true; // collection-based relations are always optional
            target = resolveTargetFromCollection(ann.targetEntity(), field);
        } else if (field.isAnnotationPresent(ManyToOne.class)) {
            ManyToOne ann = field.getAnnotation(ManyToOne.class);
            type = RelationSchema.RelationType.MANY_TO_ONE;
            optional = ann.optional();
            target = resolveTarget(ann.targetEntity(), field);
        } else {
            // ManyToMany
            ManyToMany ann = field.getAnnotation(ManyToMany.class);
            type = RelationSchema.RelationType.MANY_TO_MANY;
            mappedBy = ann.mappedBy().isEmpty() ? null : ann.mappedBy();
            optional = true; // collection-based relations are always optional
            target = resolveTargetFromCollection(ann.targetEntity(), field);
        }

        String targetName = (target != null && target != void.class)
                ? target.getSimpleName()
                : "Unknown";

        return new RelationSchema(field.getName(), type, targetName, mappedBy, optional);
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
        // Default JPA convention: class simple name (uppercase first)
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
        // Try to extract generic type parameter
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
