package com.spring.mockspring.entity;

import com.dbvcs.annotation.DbvcsComment;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_coupon")
@DbvcsComment("Represents a discount coupon applied to a specific order, including percentage off and maximum discount cap.")
public class OrderCoupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Unique promo code string entered by the customer at checkout.")
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
