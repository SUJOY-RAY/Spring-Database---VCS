package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_coupon")
@DbvcsComment("Represents a discount coupon applied to a specific order, including percentage off and maximum discount cap.")
@BusinessModule(name = ModuleType.ORDER, description = "Coupon and promotion management within orders")
@Domain(name = DomainType.ORDERS, description = "Orders domain")
@Purpose(value = "Records promotional coupons applied to orders", description = "Tracks discount codes, eligibility rules, and financial impact")
@Criticality(level = CriticalityLevel.HIGH, description = "Financial impact on revenue; misuse can cause revenue leakage")
@TableType(type = TableTypeValue.TRANSACTIONAL, description = "Coupon-to-order association record")
@TransactionalData
@BusinessOwner("Marketing & Promotions Team")
@TechnicalOwner("Platform Engineering")
@DataClassification(level = DataClassificationLevel.INTERNAL, description = "Internal promotion data")
@AccessLevel(level = AccessLevelValue.INTERNAL_ONLY)
@LawfulBasis(type = LawfulBasisType.CONTRACT, description = "Applied as part of purchase transaction")
@DataRetention(type = RetentionType.SEVEN_YEARS, description = "Retained with parent order for financial audit")
@Lifecycle(value = LifecycleStage.ACTIVE)
@UpdateStrategy(value = UpdateType.APPEND_ONLY)
@DataQualityLevel(level = QualityLevel.HIGH)
@DataQuality(rules = {"code must be unique", "discountPercent must be between 0 and 100", "maxDiscountAmount must be > 0"})
@Remarks("A coupon belongs to one order. One order may have at most one coupon applied.")
public class OrderCoupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Unique promo code string entered by the customer at checkout.")
    @BusinessKey
    @NaturalKey
    @Searchable
    @IndexedFor(purpose = "Coupon redemption validation at checkout")
    @Masking(strategy = MaskingStrategy.PARTIAL)
    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @DbvcsComment("Discount expressed as a percentage (e.g. 15.00 = 15%).")
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @DbvcsComment("Hard cap on the monetary saving; the actual discount never exceeds this value.")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal maxDiscountAmount;

    @DbvcsComment("Timestamp after which the coupon can no longer be redeemed.")
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @DbvcsComment("False when the coupon has been manually deactivated before its expiry date.")
    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    public OrderCoupon() {}

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public BigDecimal getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(BigDecimal discountPercent) { this.discountPercent = discountPercent; }
    public BigDecimal getMaxDiscountAmount() { return maxDiscountAmount; }
    public void setMaxDiscountAmount(BigDecimal maxDiscountAmount) { this.maxDiscountAmount = maxDiscountAmount; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
}
