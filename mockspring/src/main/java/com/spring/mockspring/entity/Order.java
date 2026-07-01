package com.spring.mockspring.entity;

import com.dbvcs.annotation.DbvcsComment;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders")
@DbvcsComment("Records every customer order placed through the storefront, tracking status from placement through delivery.")
public class Order {

    public enum Status { PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Human-readable unique reference printed on receipts and confirmation emails.")
    @Column(nullable = false, unique = true, length = 40)
    private String orderNumber;

    @DbvcsComment("Lifecycle state: PENDING → CONFIRMED → SHIPPED → DELIVERED, or CANCELLED.")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @DbvcsComment("Sum of all line totals after discounts, before tax.")
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @DbvcsComment("Timestamp when the customer submitted the order. Immutable after creation.")
    @Column(nullable = false, updatable = false)
    private LocalDateTime placedAt = LocalDateTime.now();

    @DbvcsComment("Populated when the order transitions to SHIPPED status.")
    private LocalDateTime shippedAt;

    @DbvcsComment("Populated when the carrier confirms delivery.")
    private LocalDateTime deliveredAt;

    // Many orders belong to one user
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // One order has many line items
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
