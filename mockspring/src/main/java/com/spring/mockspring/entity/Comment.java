package com.spring.mockspring.entity;

import com.dbvcs.annotation.DataRetentionPolicy;
import com.dbvcs.annotation.EntityMetadata;
import com.dbvcs.annotation.EntityType;
import com.dbvcs.annotation.FieldMetadata;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@EntityMetadata(
    description = "Comment entitwjkrehbfcwejhkcbwhijcebkwjhbcjhwebkcjhewbkjchwebhkcjewvchukwehuijkwebcuhkjwbvjhwevhjcewbhkjcewhijkcewbvilhcjkwebckhjwbihy for post discussions",
    domain = "CONTENT",
    submodule = "iuwbv",
    type = EntityType.AGGREGATE,
    classification = "INTERNAL",
    criticality = "LOW",
    auditable = true,
    retention = DataRetentionPolicy.PERMANENT
)
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @FieldMetadata(
        description = "Unique identifier for the comment",
        dataType = "BIGINT",
        indexStrategy = "PRIMARY",
        pii = true
    
    )
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    @FieldMetadata(
        description = "Reference to Post entity",
        dataType = "BIGINT",
        indexStrategy = "COMPOSITE"
    )
    private Post post;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @FieldMetadata(
        description = "Reference to User entity",
        dataType = "BIGINT",
        indexStrategy = "COMPOSITE"
    )
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    @FieldMetadata(
        description = "Comment content",
        dataType = "TEXT",
        classification = "INTERNAL",
        audited = true
    )
    private String content;

    @Column(nullable = false)
    @FieldMetadata(
        description = "Comment creation timestamp",
        dataType = "TIMESTAMP",
        audited = true
    )
    private LocalDateTime createdAt = LocalDateTime.now();

    public Comment() {}

    public Long getId() { return id; }
    public Post getPost() { return post; }
    public void setPost(Post post) { this.post = post; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
