package com.dbdocs.model;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Represents a single field/column on an entity, including all
 * dbdocs metadata annotations collected at startup.
 */
public class FieldSchema {

    private String name;
    private String javaType;
    private boolean nullable;
    private boolean id;
    private String columnName;
    private String comment;

    /**
     * Flat key/value map of every dbdocs metadata annotation present on this field.
     * Keys are annotation attribute paths (e.g. {@code "pii.value"}, {@code "masking.strategy"}).
     * Values are always strings (enum names, free text, comma-joined arrays).
     */
    private Map<String, Object> metadata = new LinkedHashMap<>();

    public FieldSchema() {}

    public FieldSchema(String name, String javaType, boolean nullable, boolean id, String columnName) {
        this.name = name;
        this.javaType = javaType;
        this.nullable = nullable;
        this.id = id;
        this.columnName = columnName;
    }

    public FieldSchema(String name, String javaType, boolean nullable, boolean id,
                       String columnName, String comment) {
        this.name = name;
        this.javaType = javaType;
        this.nullable = nullable;
        this.id = id;
        this.columnName = columnName;
        this.comment = comment;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getJavaType() { return javaType; }
    public void setJavaType(String javaType) { this.javaType = javaType; }

    public boolean isNullable() { return nullable; }
    public void setNullable(boolean nullable) { this.nullable = nullable; }

    public boolean isId() { return id; }
    public void setId(boolean id) { this.id = id; }

    public String getColumnName() { return columnName; }
    public void setColumnName(String columnName) { this.columnName = columnName; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}
