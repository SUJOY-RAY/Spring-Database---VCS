package com.spring.mockspring.entity;

import java.util.UUID;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;

@Entity
@Table(name = "addresses")
@Domain(name = DomainType.CUSTOMER, description = "Customer domain")
@Criticality(level = CriticalityLevel.HIGH, description = "Required for order delivery")
@TableType(type = TableTypeValue.MASTER, description = "Master address record per user")
@DataClassification(level = DataClassificationLevel.CONFIDENTIAL, description = "Contains physical location PII")
@AccessLevel(level = AccessLevelValue.RESTRICTED)
@Pii("Contains physical home or billing address")
@DataRetention(type = RetentionType.SEVEN_YEARS, description = "Retained with associated user account")
@UpdateStrategy(value = UpdateType.UPSERT)
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID uuid;

    @Pii("Physical location identifier")
    @DataClassification(level = DataClassificationLevel.CONFIDENTIAL)
    @Column(nullable = false, length = 120)
    private String street;

    @Pii("Part of physical address")
    @Searchable
    @Column(nullable = false, length = 80)
    private String city;

    @Comment("State or province name.")
    @Pii("Part of physical address")
    @Column(nullable = false, length = 80)
    private String state;

    @Comment("ZIP or postal code for the address.")
    @Pii("Geographic identifier")
    @Searchable
    @IndexedFor(purpose = "Geo-based delivery zone lookup")
    @Column(nullable = false, length = 20)
    private String postalCode;

    @Comment("ISO 3166-1 country name or code.")
    @Searchable
    @Column(nullable = false, length = 60)
    private String country;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    public Address() {}

    public Long getId() { return id; }
    public String getStreet() { return street; }
    public void setStreet(String street) { this.street = street; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
