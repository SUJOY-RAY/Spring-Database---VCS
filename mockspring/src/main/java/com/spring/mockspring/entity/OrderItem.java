package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@DbvcsComment("Each row is a single line item within an order, capturing the product, quantity, unit price, and computed line total.")
@BusinessModule(name = ModuleType.ORDER, description = "Order line items")
@Domain(name = DomainType.ORDERS, description = "Orders domain")
@Purpose(value = "Stores individual product lines within an order", description = "Child of Order; drives revenue calculations and inventory deduction")
@Criticality(level = CriticalityLevel.CRITICAL, description = "Drives revenue reporting and inventory management")
@TableType(type = TableTypeValue.TRANSACTIONAL, description = "Transactional line-item record")
@TransactionalData
@BusinessOwner("Commerce Operations")
@TechnicalOwner("Platform Engineering")
@DataClassification(level = DataClassificationLevel.CONFIDENTIAL, description = "Contains financial pricing data")
@AccessLevel(level = AccessLevelValue.RESTRICTED)
@LawfulBasis(type = LawfulBasisType.CONTRACT, description = "Required for order fulfilment")
@DataRetention(type = RetentionType.SEVEN_YEARS, description = "Retained with parent order for financial compliance")
@Lifecycle(value = LifecycleStage.ACTIVE)
@UpdateStrategy(value = UpdateType.APPEND_ONLY)
@DataQualityLevel(level = QualityLevel.HIGH)
@DataQuality(rules = {"quantity must be > 0", "lineTotal must equal quantity * unitPrice", "unitPrice must be snapshotted at order time"})
@Remarks("unitPrice is a snapshot of the product price at order time — not the live catalogue price.")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Number of units of the product purchased in this line item.")
    @Column(nullable = false)
    private Integer quantity;

    @DbvcsComment("Price per unit at the time the order was placed; snapshot to avoid drift if the product price changes later.")
    @DataClassification(level = DataClassificationLevel.CONFIDENTIAL)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @DbvcsComment("Computed as quantity × unitPrice. Stored for fast reporting without recalculation.")
    @Derived(expression = "quantity * unitPrice")
    @DataClassification(level = DataClassificationLevel.CONFIDENTIAL)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal lineTotal;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

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
