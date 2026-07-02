package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "products")
@DbvcsComment("Catalogue of all products available for purchase, including pricing, stock level, and availability flag.")
@BusinessModule(name = ModuleType.PRODUCT, description = "Product catalogue management")
@Domain(name = DomainType.INVENTORY, description = "Product and inventory domain")
@Purpose(value = "Defines sellable products in the catalogue", description = "Master product record; drives storefront display, pricing, and inventory tracking")
@Criticality(level = CriticalityLevel.CRITICAL, description = "Revenue-generating master data; must be accurate and available at all times")
@TableType(type = TableTypeValue.MASTER, description = "Master product catalogue")
@MasterData
@BusinessOwner("Product Management Team")
@TechnicalOwner("Catalogue Engineering")
@DataSteward("Inventory Data Governance")
@DataClassification(level = DataClassificationLevel.INTERNAL, description = "Internal product and pricing data")
@AccessLevel(level = AccessLevelValue.INTERNAL_ONLY)
@LawfulBasis(type = LawfulBasisType.LEGITIMATE_INTERESTS, description = "Core business product data")
@DataRetention(type = RetentionType.INDEFINITE, description = "Product records retained indefinitely for historical order references")
@Lifecycle(value = LifecycleStage.ACTIVE)
@UpdateStrategy(value = UpdateType.UPSERT)
@Auditable
@AuditColumns(createdAt = "created_at")
@RefreshFrequency(value = Frequency.DAILY)
@DataQualityLevel(level = QualityLevel.HIGH)
@DataQuality(rules = {"name must not be null", "price must be > 0", "uniqueID must be unique", "stockQuantity must be >= 0"})
@ApiExposed
@PublicApi
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Display name of the product as shown in the storefront.")
    @Searchable
    @IndexedFor(purpose = "Full-text product search in the storefront")
    @Column(nullable = false, length = 200)
    private String name;

    @DbvcsComment("Internal unique SKU or product identifier used for catalogue management.")
    @BusinessKey
    @NaturalKey
    @Searchable
    @IndexedFor(purpose = "SKU-based lookup in warehouse and order processing systems")
    @Column(nullable = false, length = 200)
    private String uniqueID;

    @DbvcsComment("Long-form marketing description shown on the product detail page; supports plain text.")
    @Column(length = 2000)
    private String description;

    @DbvcsComment("Retail selling price of the product in the default currency.")
    @DataClassification(level = DataClassificationLevel.INTERNAL, description = "Pricing data — not publicly queryable via raw API")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @DbvcsComment("Current units in stock. Decremented on order placement; incremented on restock.")
    @Searchable
    @Column(nullable = false)
    private Integer stockQuantity = 0;

    @DbvcsComment("False hides the product from the storefront without deleting it.")
    @Column(nullable = false)
    private boolean available = true;

    @DbvcsComment("Timestamp when the product was first added to the catalogue.")
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToMany
    @JoinTable(
        name = "product_categories",
        joinColumns = @JoinColumn(name = "product_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private List<Category> categories;

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    private List<OrderItem> orderItems;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Review> reviews;

    public Product() {}

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<Category> getCategories() { return categories; }
    public void setCategories(List<Category> categories) { this.categories = categories; }
    public List<OrderItem> getOrderItems() { return orderItems; }
    public List<Review> getReviews() { return reviews; }
}
