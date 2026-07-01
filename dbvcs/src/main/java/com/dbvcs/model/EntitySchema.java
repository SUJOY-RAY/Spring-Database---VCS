package com.dbvcs.model;

import java.util.List;

/**
 * Represents the full schema of a single JPA entity.
 */
public class EntitySchema {

    private String className;
    private String simpleClassName;
    private String tableName;
    private String comment;
    private List<FieldSchema> fields;
    private List<RelationSchema> relations;

    public EntitySchema() {}

    public EntitySchema(String className, String simpleClassName, String tableName,
                        List<FieldSchema> fields, List<RelationSchema> relations) {
        this.className = className;
        this.simpleClassName = simpleClassName;
        this.tableName = tableName;
        this.fields = fields;
        this.relations = relations;
    }

    public EntitySchema(String className, String simpleClassName, String tableName,
                        String comment, List<FieldSchema> fields, List<RelationSchema> relations) {
        this.className = className;
        this.simpleClassName = simpleClassName;
        this.tableName = tableName;
        this.comment = comment;
        this.fields = fields;
        this.relations = relations;
    }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getSimpleClassName() { return simpleClassName; }
    public void setSimpleClassName(String simpleClassName) { this.simpleClassName = simpleClassName; }

    public String getTableName() { return tableName; }
    public void setTableName(String tableName) { this.tableName = tableName; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public List<FieldSchema> getFields() { return fields; }
    public void setFields(List<FieldSchema> fields) { this.fields = fields; }

    public List<RelationSchema> getRelations() { return relations; }
    public void setRelations(List<RelationSchema> relations) { this.relations = relations; }
}
