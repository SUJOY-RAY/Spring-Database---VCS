package com.spring.mockspring.entity;

import com.dbvcs.annotation.EntityMetadata;
import com.dbvcs.annotation.FieldMetadata;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@EntityMetadata(
    description = "User account entity for authentication and authorizationUser account entity for authentication and authorizationUser account entity for authentication and authorizationUser account entity for authentication and authorizationUser account entity for authentication and authorizationUser account entity for authentication and authorizationUser account entity for authentication and authorizationUser account entity for authentication and authorizationUser account entity for authentication and authorizationUser account entity for authentication and authorizationUser account entity for authentication and authorization",
    domain = "IDENTITY",
    type = "MASTER",
    classification = "CONFIDENTIAL",
    criticality = "HIGH",
    auditable = true,
    submodule = "lwein"
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @FieldMetadata(
        description = "Unique identifier for the user",
        dataType = "BIGINT",
        indexStrategy = "PRIMARY"
    )
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    @FieldMetadata(
        description = "User email address",
        dataType = "STRING",
        classification = "CONFIDENTIAL",
        pii = true,
        piiCategory = "EMAIL",
        indexStrategy = "UNIQUE",
        audited = true
    )
    private String email;

    @Column(nullable = false, length = 60)
    @FieldMetadata(
        description = "User first name",
        dataType = "STRING",
        classification = "INTERNAL",
        pii = true,
        piiCategory = "NAME"
    )
    private String firstName;

    @Column(nullable = false, length = 60)
    @FieldMetadata(
        description = "User last name",
        dataType = "STRING",
        classification = "INTERNAL",
        pii = true,
        piiCategory = "NAME"
    )
    private String lastName;

    @Column(nullable = false)
    @FieldMetadata(
        description = "Hashed password for authentication",
        dataType = "STRING",
        classification = "RESTRICTED",
        encryption = "BCRYPT",
        accessLevel = "ADMIN_ONLY"
    )
    private String passwordHash;

    @Column(nullable = false)
    @FieldMetadata(
        description = "Account active status",
        dataType = "BOOLEAN"
    )
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    @FieldMetadata(
        description = "Account creation timestamp",
        dataType = "TIMESTAMP",
        audited = true
    )
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @FieldMetadata(
        description = "User profile (one-to-one relationship)",
        dataType = "OBJECT"
    )
    private Profile profile;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @FieldMetadata(
        description = "Posts created by this user (one-to-many relationship)",
        dataType = "COLLECTION"
    )
    private Set<Post> posts = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @FieldMetadata(
        description = "Comments created by this user (one-to-many relationship)",
        dataType = "COLLECTION"
    )
    private Set<Comment> comments = new HashSet<>();


    public User() {}

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Profile getProfile() { return profile; }
    public void setProfile(Profile profile) { this.profile = profile; }
    public Set<Post> getPosts() { return posts; }
    public void setPosts(Set<Post> posts) { this.posts = posts; }
    public Set<Comment> getComments() { return comments; }
    public void setComments(Set<Comment> comments) { this.comments = comments; }
}
