package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_image")
@DbvcsComment("Holds image URLs and metadata for product photos, supporting multiple images per product with sort order and a primary flag.")
@BusinessModule(name = ModuleType.PRODUCT, description = "Product media and image management")
@Domain(name = DomainType.INVENTORY, description = "Product domain")
@Purpose(value = "Stores image URLs and display metadata for product photos", description = "Supports multiple images per product with ordering and primary designation")
@Criticality(level = CriticalityLevel.MEDIUM, description = "Impacts storefront UX but not transactional integrity")
@TableType(type = TableTypeValue.MASTER, description = "Product image asset records")
@BusinessOwner("Product Management Team")
@TechnicalOwner("Catalogue Engineering")
@DataClassification(level = DataClassificationLevel.PUBLIC, description = "Image URLs are publicly served on the storefront")
@AccessLevel(level = AccessLevelValue.PUBLIC)
@LawfulBasis(type = LawfulBasisType.LEGITIMATE_INTERESTS, description = "Product media for commercial display")
@DataRetention(type = RetentionType.INDEFINITE, description = "Retained as long as product exists")
@Lifecycle(value = LifecycleStage.ACTIVE)
@UpdateStrategy(value = UpdateType.UPSERT)
@RefreshFrequency(value = Frequency.DAILY)
@DataQualityLevel(level = QualityLevel.MEDIUM)
@DataQuality(rules = {"url must be a valid HTTPS URL", "sortOrder must be >= 0", "only one image per product may have primary = true"})
@PublicApi
public class ProductImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("HTTPS URL pointing to the hosted product image asset.")
    @Searchable
    @Column(nullable = false, length = 512)
    private String url;

    @DbvcsComment("Accessibility alt-text for the image; displayed when image cannot load and read by screen readers.")
    @Column(length = 150)
    private String altText;

    @DbvcsComment("Display order position; lower values appear first in image galleries.")
    @IndexedFor(purpose = "Ordered image gallery rendering")
    @Column(nullable = false)
    private int sortOrder = 0;

    @DbvcsComment("Marks the hero/primary image shown in listing views. Only one image per product should be true.")
    @IndexedFor(purpose = "Primary image lookup for product listing pages")
    @Column(nullable = false)
    private boolean primary = false;

    @DbvcsComment("Timestamp when the image was uploaded. Immutable.")
    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    public ProductImage() {}

    public Long getId() { return id; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getAltText() { return altText; }
    public void setAltText(String altText) { this.altText = altText; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isPrimary() { return primary; }
    public void setPrimary(boolean primary) { this.primary = primary; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
}
