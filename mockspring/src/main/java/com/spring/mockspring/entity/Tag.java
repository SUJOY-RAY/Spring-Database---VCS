package com.spring.mockspring.entity;

import com.dbdocs.annotation.*;
import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "tags")
@EntityMetadata(
    description = "Tag entity for categorizing posts",
    domain = "CONTENT",
    type = "MASTER",
    classification = "INTERNAL",
    criticality = "LOW",
    auditable = true,
    submodule = " kjbdc"
)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @FieldMetadata(
        description = "Unique identifier for the tag",
        dataType = "BIGINT",
        indexStrategy = "PRIMARY"
    )
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    @FieldMetadata(
        description = "Tag name",
        dataType = "STRING",
        indexStrategy = "UNIQUE",
        audited = true
    )
    private String name;

    @Column(length = 255)
    @FieldMetadata(
        description = "Tag description",
        dataType = "STRING",
        classification = "INTERNAL"
    )
    private String description;

    @ManyToMany(mappedBy = "tags")
    @FieldMetadata(
        description = "Collection of posts with this tag",
        dataType = "COLLECTION"
    )
    private Set<Post> posts = new HashSet<>();

    public Tag() {}

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Set<Post> getPosts() { return posts; }
    public void setPosts(Set<Post> posts) { this.posts = posts; }
}
