package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders")
@Comment("Records every customer order placed through the storefront, tracking status from placement through delivery.")
@Domain(name = DomainType.ORDERS, description = "Orders domain")
@Criticality(level = CriticalityLevel.CRITICAL, description = "Core revenue-generating entity — must never be deleted")
@TableType(type = TableTypeValue.TRANSACTIONAL, description = "Transactional order record")
@TransactionalData
@DataClassification(level = DataClassificationLevel.CONFIDENTIAL, description = "Contains financial transaction data")
@AccessLevel(level = AccessLevelValue.RESTRICTED)
@DataRetention(type = RetentionType.SEVEN_YEARS, description = "Financial records retained for 7 years per legal requirement")
@UpdateStrategy(value = UpdateType.APPEND_ONLY)
@Auditable
@AuditColumns(createdAt = "placed_at")
@Versioned
@RefreshFrequency(value = Frequency.REALTIME)
@ApiExposed
public class Order {

    public enum Status { PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("Human-readable unique reference printed on receipts and confirmation emails.")
    @Searchable
    @IndexedFor(purpose = "Receipt lookup and customer service reference")
    @Column(nullable = false, unique = true, length = 40)
    private String orderNumber;

    @Comment("Lifecycle state: PENDING → CONFIRMED → SHIPPED → DELIVERED, or CANCELLED.")
    @Searchable
    @IndexedFor(purpose = "Order status dashboard filtering")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Comment("Sum of all line totals after discounts, before tax.")
    @DataClassification(level = DataClassificationLevel.CONFIDENTIAL, description = "Financial amount — internal use only")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Comment("Timestamp when the customer submitted the order. Immutable after creation.")
    @Column(nullable = false, updatable = false)
    private LocalDateTime placedAt = LocalDateTime.now();

    @Comment("Populated when the order transitions to SHIPPED status.")
    private LocalDateTime shippedAt;

    @Comment("Populated when the carrier confirms delivery.")
    private LocalDateTime deliveredAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderItem> items;

    public Order() {}

    public Long getId() { return id; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public LocalDateTime getPlacedAt() { return placedAt; }
    public LocalDateTime getShippedAt() { return shippedAt; }
    public void setShippedAt(LocalDateTime shippedAt) { this.shippedAt = shippedAt; }
    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public List<OrderItem> getItems() { return items; }
}
