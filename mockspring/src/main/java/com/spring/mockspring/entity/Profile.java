package com.spring.mockspring.entity;

import com.dbdocs.annotation.*;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "profiles")
@EntityMetadata(
    description = "User profile entity for personal information",
    domain = "IDENTITY",
    type = "MASTER",
    classification = "INTERNAL",
    criticality = "MEDIUM",
    auditable = true,
    accessLevel = "domain",
    submodule = "wdoiucn"
)
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @FieldMetadata(
        description = "Unique identifier for the profile",
        dataType = "BIGINT",
        indexStrategy = "PRIMARY"
    )
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @FieldMetadata(
        description = "Reference to User entity",
        dataType = "BIGINT",
        indexStrategy = "UNIQUE"
    )
    private User user;

    @Column(length = 500)
    @FieldMetadata(
        description = "User biography or about section",
        dataType = "STRING",
        classification = "INTERNAL"
    )
    private String bio;
    
    @Column(length = 100)
    @FieldMetadata(
        description = "Phone number",
        dataType = "STRING",
        classification = "CONFIDENTIAL",
        pii = true,
        piiCategory = "PHONE"
    )
    private String phone;

    @Column(nullable = false)
    @FieldMetadata(
        description = "Profile creation timestamp",
        dataType = "TIMESTAMP",
        audited = true
    )
    private LocalDateTime createdAt = LocalDateTime.now();

    public Profile() {}

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
