package com.spring.mockspring.entity;

import com.dbvcs.annotation.DbvcsComment;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_shipment")
@DbvcsComment("Tracks the shipment details for an order, including carrier, tracking number, and estimated/actual delivery timestamps.")
public class OrderShipment {

    public enum Carrier { UPS, FEDEX, DHL, USPS, LOCAL }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Carrier-issued tracking number; can be used to deep-link to the carrier tracking page.")
    @Column(nullable = false, unique = true, length = 80)
    private String trackingNumber;

    @DbvcsComment("Shipping carrier responsible for delivery: UPS, FEDEX, DHL, USPS, or LOCAL courier.")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Carrier carrier = Carrier.LOCAL;

    @Column(nullable = false)
    private LocalDateTime shippedAt = LocalDateTime.now();

    @DbvcsComment("Carrier's estimated delivery window; null if not yet provided.")
    private LocalDateTime estimatedDelivery;

    @DbvcsComment("Actual delivery timestamp confirmed by the carrier; null until delivered.")
    private LocalDateTime deliveredAt;

    @DbvcsComment("Free-text field for internal handling notes or special delivery instructions.")
    @Column(length = 255)
    private String notes;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    public OrderShipment() {}

    public Long getId() { return id; }
    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }
    public Carrier getCarrier() { return carrier; }
    public void setCarrier(Carrier carrier) { this.carrier = carrier; }
    public LocalDateTime getShippedAt() { return shippedAt; }
    public void setShippedAt(LocalDateTime shippedAt) { this.shippedAt = shippedAt; }
    public LocalDateTime getEstimatedDelivery() { return estimatedDelivery; }
    public void setEstimatedDelivery(LocalDateTime estimatedDelivery) { this.estimatedDelivery = estimatedDelivery; }
    public LocalDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDateTime deliveredAt) { this.deliveredAt = deliveredAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
}
