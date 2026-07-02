package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;

@Entity
@Table(name = "addresses")
@DbvcsComment("Stores the physical shipping/billing address linked one-to-one with a user account.")
@BusinessModule(name = ModuleType.CUSTOMER, description = "Customer address data")
@Domain(name = DomainType.CUSTOMER, description = "Customer domain")
@Purpose(value = "Stores user shipping and billing addresses", description = "One-to-one with User; used during order fulfilment")
@Criticality(level = CriticalityLevel.HIGH, description = "Required for order delivery")
@TableType(type = TableTypeValue.MASTER, description = "Master address record per user")
@BusinessOwner("Customer Experience Team")
@TechnicalOwner("Platform Engineering")
@DataSteward("Customer Data Governance Team")
@DataClassification(level = DataClassificationLevel.CONFIDENTIAL, description = "Contains physical location PII")
@AccessLevel(level = AccessLevelValue.RESTRICTED)
@Pii("Contains physical home or billing address")
@LawfulBasis(type = LawfulBasisType.CONTRACT, description = "Required for order delivery")
@DataRetention(type = RetentionType.SEVEN_YEARS, description = "Retained with associated user account")
@Lifecycle(value = LifecycleStage.ACTIVE)
@UpdateStrategy(value = UpdateType.UPSERT)
@DataQualityLevel(level = QualityLevel.HIGH)
@DataQuality(rules = {"street, city, postalCode, and country must not be null"})
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Street line including house number.")
    @Pii("Physical location identifier")
    @PiiCategory(type = PiiType.ADDRESS, description = "Street line of the address")
    @DataClassification(level = DataClassificationLevel.CONFIDENTIAL)
    @Column(nullable = false, length = 120)
    private String street;

    @DbvcsComment("City or town name.")
    @Pii("Part of physical address")
    @PiiCategory(type = PiiType.ADDRESS, description = "City of residence or delivery")
    @Searchable
    @Column(nullable = false, length = 80)
    private String city;

    @DbvcsComment("State or province name.")
    @Pii("Part of physical address")
    @PiiCategory(type = PiiType.ADDRESS, description = "State or province")
    @Column(nullable = false, length = 80)
    private String state;

    @DbvcsComment("ZIP or postal code for the address.")
    @Pii("Geographic identifier")
    @PiiCategory(type = PiiType.ADDRESS, description = "Postal/ZIP code")
    @Searchable
    @IndexedFor(purpose = "Geo-based delivery zone lookup")
    @Column(nullable = false, length = 20)
    private String postalCode;

    @DbvcsComment("ISO 3166-1 country name or code.")
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
