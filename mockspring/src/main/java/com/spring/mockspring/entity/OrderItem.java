package com.spring.mockspring.entity;

import com.dbvcs.annotation.DbvcsComment;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@DbvcsComment("Each row is a single line item within an order, capturing the product, quantity, unit price, and computed line total.")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Number of units of the product purchased in this line item.")
    @Column(nullable = false)
    private Integer quantity;

    @DbvcsComment("Price per unit at the time the order was placed; snapshot to avoid drift if the product price changes later.")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @DbvcsComment("Computed as quantity × unitPrice. Stored for fast reporting without recalculation.")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal lineTotal;

    // Many items belong to one order
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // Many items reference one product
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    public OrderItem() {}

    public Long getId() { return id; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public BigDecimal getLineTotal() { return lineTotal; }
    public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
}
