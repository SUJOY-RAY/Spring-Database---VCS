package com.spring.mockspring.entity;

import com.dbvcs.annotation.DbvcsComment;
import jakarta.persistence.*;

@Entity
@Table(name = "addresses")
@DbvcsComment("Stores the physical shipping/billing address linked one-to-one with a user account.")
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String street;

    @Column(nullable = false, length = 80)
    private String city;

    @DbvcsComment("State or province name.")
    @Column(nullable = false, length = 80)
    private String state;

    @DbvcsComment("ZIP or postal code for the address.")
    @Column(nullable = false, length = 20)
    private String postalCode;

    @DbvcsComment("ISO 3166-1 country name or code.")
    @Column(nullable = false, length = 60)
    private String country;

    // One-to-one back to User
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
