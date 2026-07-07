package com.spring.mockspring.entity;

import com.dbdocs.annotation.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "posts")
@EntityMetadata(
    description = "Blog post entity created by users",
    domain = "CUSTOMER",
    type = EntityType.TRANSACTIONAL,
    classification = DataClassification.INTERNAL,
    criticality = CriticalityLevel.MEDIUM,
    auditable = true,
    submodule = "kjbd"
)
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @FieldMetadata(
        description = "Unique identifier for the post",
        dataType = "BIGINT",
        indexStrategy = "PRIMARY"
    )
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @FieldMetadata(
        description = "Reference to User entity",
        // dataType = "BIGINT",
        indexStrategy = "COMPOSITE"
    )
    private User user;

    @Column(nullable = false, length = 255)
    @FieldMetadata(
        description = "Post title",
        dataType = "STRING",
        classification = "INTERNAL",
        audited = true
    )
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    @FieldMetadata(
        description = "Post content",
        dataType = "TEXT",
        classification = "INTERNAL",
        audited = true
    )
    private String content;

    @Column(nullable = false)
    @FieldMetadata(
        description = "Post creation timestamp",
        dataType = "TIMESTAMP",
        audited = true
    )
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    @FieldMetadata(
        description = "Post last modified timestamp",
        dataType = "TIMESTAMP",
        audited = true
    )
    private LocalDateTime updatedAt = LocalDateTime.now();

    @ManyToMany
    @JoinTable(
        name = "post_tags",
        joinColumns = @JoinColumn(name = "post_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @FieldMetadata(
        description = "Collection of tags assigned to this post",
        dataType = "COLLECTION"
    )
    private Set<Tag> tags = new HashSet<>();

    public Post() {}

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
}
