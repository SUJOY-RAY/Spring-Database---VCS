package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "products")
@Comment("Catalogue of all products available for purchase, including pricing, stock level, and availability flag.")
@Domain(name = DomainType.INVENTORY, description = "Product and inventory domain")
@Criticality(level = CriticalityLevel.CRITICAL, description = "Revenue-generating master data; must be accurate and available at all times")
@TableType(type = TableTypeValue.MASTER, description = "Master product catalogue")
@DataClassification(level = DataClassificationLevel.INTERNAL, description = "Internal product and pricing data")
@AccessLevel(level = AccessLevelValue.INTERNAL_ONLY)
@DataRetention(type = RetentionType.INDEFINITE, description = "Product records retained indefinitely for historical order references")
@UpdateStrategy(value = UpdateType.UPSERT)
@Auditable
@AuditColumns(createdAt = "created_at")
@RefreshFrequency(value = Frequency.DAILY)
@ApiExposed
@PublicApi
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("Display name of the product as shown in the storefront.")
    @Searchable
    @IndexedFor(purpose = "Full-text product search in the storefront")
    @Column(nullable = false, length = 200)
    private String name;

    @Comment("Internal unique SKU or product identifier used for catalogue management.")
    @Searchable
    @IndexedFor(purpose = "SKU-based lookup in warehouse and order processing systems")
    @Column(nullable = false, length = 200)
    private String uniqueID;

    @Comment("Long-form marketing description shown on the product detail page; supports plain text.")
    @Column(length = 2000)
    private String description;

    @Comment("Retail selling price of the product in the default currency.")
    @DataClassification(level = DataClassificationLevel.INTERNAL, description = "Pricing data — not publicly queryable via raw API")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Comment("Current units in stock. Decremented on order placement; incremented on restock.")
    @Searchable
    @Column(nullable = false)
    private Integer stockQuantity = 0;

    @Comment("False hides the product from the storefront without deleting it.")
    @Column(nullable = false)
    private boolean available = true;

    @Comment("Timestamp when the product was first added to the catalogue.")
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
