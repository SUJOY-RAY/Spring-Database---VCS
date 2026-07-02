package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@DbvcsComment("Customer-submitted product reviews with a 1–5 star rating, optional title, and free-text body.")
@BusinessModule(name = ModuleType.PRODUCT, description = "Customer product reviews and ratings")
@Domain(name = DomainType.CUSTOMER, description = "Customer-generated content")
@Purpose(value = "Stores customer reviews and star ratings for products", description = "User-generated content; drives product credibility and purchase decisions")
@Criticality(level = CriticalityLevel.MEDIUM, description = "Impacts conversion rate; free-text may contain PII or harmful content")
@TableType(type = TableTypeValue.TRANSACTIONAL, description = "User-generated review record")
@TransactionalData
@BusinessOwner("Customer Experience Team")
@TechnicalOwner("Platform Engineering")
@DataSteward("Customer Data Governance Team")
@DataClassification(level = DataClassificationLevel.INTERNAL, description = "User content — moderated before public display")
@AccessLevel(level = AccessLevelValue.INTERNAL_ONLY)
@Pii("Free-text body field may contain personal information submitted by users")
@LawfulBasis(type = LawfulBasisType.CONSENT, description = "User voluntarily submits review content")
@ConsentRequired("User consent obtained at time of review submission")
@DataRetention(type = RetentionType.THREE_YEARS, description = "Retained for 3 years or until user requests deletion")
@Lifecycle(value = LifecycleStage.ACTIVE)
@UpdateStrategy(value = UpdateType.UPSERT)
@DataQualityLevel(level = QualityLevel.MEDIUM)
@DataQuality(rules = {"rating must be between 1 and 5", "body must be moderated before display"})
@ApiExposed
@Remarks("Review body must be moderated for harmful content before being surfaced publicly.")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Star rating given by the customer; must be an integer between 1 and 5.")
    @Searchable
    @IndexedFor(purpose = "Average rating aggregation per product")
    @Column(nullable = false)
    private Integer rating;

    @DbvcsComment("Optional short headline for the review, e.g. 'Great quality!'")
    @Column(length = 100)
    private String title;

    @DbvcsComment("Full review text written by the customer. May contain personal opinions or incidental PII.")
    @Pii("Free-text — may contain user-submitted personal data")
    @Masking(strategy = MaskingStrategy.PARTIAL)
    @DataClassification(level = DataClassificationLevel.INTERNAL)
    @Column(length = 2000)
    private String body;

    @DbvcsComment("Timestamp when the review was submitted. Immutable.")
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    public Review() {}

    public Long getId() { return id; }
    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
}
