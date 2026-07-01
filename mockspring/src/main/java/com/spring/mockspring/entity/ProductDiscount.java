package com.spring.mockspring.entity;

import com.dbvcs.annotation.DbvcsComment;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_discount")
@DbvcsComment("Defines time-bounded promotional discounts (percentage or fixed amount) that can be applied to a product.")
public class ProductDiscount {

    public enum DiscountType { PERCENTAGE, FIXED_AMOUNT }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Internal display name for the promotion, e.g. 'Summer Sale 20%'.")
    @Column(nullable = false, length = 100)
    private String label;

    @DbvcsComment("PERCENTAGE applies value as a % off; FIXED_AMOUNT deducts a flat currency value.")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DiscountType discountType = DiscountType.PERCENTAGE;

    @DbvcsComment("The discount magnitude — percentage points or currency amount depending on discountType.")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal value;

    @DbvcsComment("Discount becomes active at this timestamp; purchases before this time are not discounted.")
    @Column(nullable = false)
    private LocalDateTime startsAt;

    @DbvcsComment("Discount expires at this timestamp; no new orders can use it after this point.")
    @Column(nullable = false)
    private LocalDateTime endsAt;

    @DbvcsComment("Allows manual early deactivation of the promotion without deleting the record.")
    @Column(nullable = false)
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    public ProductDiscount() {}

    public Long getId() { return id; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public DiscountType getDiscountType() { return discountType; }
    public void setDiscountType(DiscountType discountType) { this.discountType = discountType; }
    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }
    public LocalDateTime getStartsAt() { return startsAt; }
    public void setStartsAt(LocalDateTime startsAt) { this.startsAt = startsAt; }
    public LocalDateTime getEndsAt() { return endsAt; }
    public void setEndsAt(LocalDateTime endsAt) { this.endsAt = endsAt; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
}
