package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Comment("Registered user accounts including authentication credentials, personal details, and account status.")
@Domain(name = DomainType.CUSTOMER, description = "Customer domain")
@Criticality(level = CriticalityLevel.CRITICAL, description = "Central entity referenced by orders, reviews, sessions, and notifications")
@TableType(type = TableTypeValue.MASTER, description = "Master data — one row per registered user")
@DataClassification(level = DataClassificationLevel.CONFIDENTIAL, description = "Contains PII and authentication credentials")
@AccessLevel(level = AccessLevelValue.RESTRICTED)
@Pii("Contains name, email, and hashed credentials")
@DataRetention(type = RetentionType.SEVEN_YEARS, description = "Retained for legal and audit obligations")
@UpdateStrategy(value = UpdateType.UPSERT)
@Auditable
@AuditColumns(createdBy = "created_by", updatedBy = "updated_by", createdAt = "created_at", updatedAt = "updated_at")
@Versioned
@ApiExposed
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("Primary email address used for login and communications.")
    @Searchable
    @IndexedFor(purpose = "Login lookup and unique constraint enforcement")
    @Pii("Direct identifier — uniquely identifies the person")
    @Encrypted(algorithm = EncryptionType.AES256)
    @DataClassification(level = DataClassificationLevel.CONFIDENTIAL)
    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Comment("Customer's given (first) name.")
    @Pii("Part of personal name")
    @DataClassification(level = DataClassificationLevel.CONFIDENTIAL)
    @Column(nullable = false, length = 60)
    private String firstName;

    @Comment("Customer's family (last) name.")
    @Pii("Part of personal name")
    @DataClassification(level = DataClassificationLevel.CONFIDENTIAL)
    @Column(nullable = false, length = 60)
    private String lastName;

    @Comment("Bcrypt-hashed user password. Never store or log the plain-text value.")
    @Encrypted(algorithm = EncryptionType.BCRYPT)
    @DataClassification(level = DataClassificationLevel.RESTRICTED)
    @AccessLevel(level = AccessLevelValue.ADMIN_ONLY)
    @Column(nullable = false)
    private String passwordHash;

    @Comment("Whether the account is enabled. False = soft-deleted or suspended.")
    @Column(nullable = false)
    private boolean active = true;

    @Comment("Timestamp when the account was created. Immutable after insert.")
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Address address;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Order> orders;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Review> reviews;

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
    public Address getAddress() { return address; }
    public void setAddress(Address address) { this.address = address; }
    public List<Order> getOrders() { return orders; }
    public List<Review> getReviews() { return reviews; }
}
