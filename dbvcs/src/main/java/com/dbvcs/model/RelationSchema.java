package com.dbvcs.model;

/**
 * Represents a JPA relationship between two entities.
 */
public class RelationSchema {

    public enum RelationType {
        ONE_TO_ONE,
        ONE_TO_MANY,
        MANY_TO_ONE,
        MANY_TO_MANY
    }

    private String fieldName;
    private RelationType type;
    /** Simple class name of the target entity */
    private String targetEntity;
    /** Mapped-by value if present */
    private String mappedBy;
    private boolean optional;

    public RelationSchema() {}

    public RelationSchema(String fieldName, RelationType type, String targetEntity,
                          String mappedBy, boolean optional) {
        this.fieldName = fieldName;
        this.type = type;
        this.targetEntity = targetEntity;
        this.mappedBy = mappedBy;
        this.optional = optional;
    }

    public String getFieldName() { return fieldName; }
    public void setFieldName(String fieldName) { this.fieldName = fieldName; }

    public RelationType getType() { return type; }
    public void setType(RelationType type) { this.type = type; }

    public String getTargetEntity() { return targetEntity; }
    public void setTargetEntity(String targetEntity) { this.targetEntity = targetEntity; }

    public String getMappedBy() { return mappedBy; }
    public void setMappedBy(String mappedBy) { this.mappedBy = mappedBy; }

    public boolean isOptional() { return optional; }
    public void setOptional(boolean optional) { this.optional = optional; }
}
