package com.dbvcs.model;

/**
 * Represents a single field/column on an entity.
 */
public class FieldSchema {

    private String name;
    private String javaType;
    private boolean nullable;
    private boolean id;
    private String columnName;
    private String comment;

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
}
