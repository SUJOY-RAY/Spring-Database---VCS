package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_notification")
@DbvcsComment("In-app notifications sent to users for order updates, promotions, system alerts, and review replies.")
@BusinessModule(name = ModuleType.NOTIFICATION, description = "User notification and messaging")
@Domain(name = DomainType.CUSTOMER, description = "Customer communication domain")
@Purpose(value = "Stores in-app notifications for users", description = "Records per-user notification events including type, content, read status, and delivery time")
@Criticality(level = CriticalityLevel.LOW, description = "Notification delivery failures are non-blocking; no transaction impact")
@TableType(type = TableTypeValue.TRANSACTIONAL, description = "Append-only notification event records")
@BusinessOwner("Customer Experience Team")
@TechnicalOwner("Platform Engineering")
@DataClassification(level = DataClassificationLevel.INTERNAL, description = "Internal user communication data; not publicly exposed")
@AccessLevel(level = AccessLevelValue.INTERNAL_ONLY)
@LawfulBasis(type = LawfulBasisType.CONTRACT, description = "Notifications are part of the service contract with the user")
@DataRetention(type = RetentionType.ONE_YEAR, description = "Notifications retained for one year then purged")
@Lifecycle(value = LifecycleStage.ACTIVE)
@UpdateStrategy(value = UpdateType.APPEND_ONLY)
@DataQualityLevel(level = QualityLevel.MEDIUM)
@DataQuality(rules = {"title and message must not be null", "readAt must be null or after createdAt", "type must be a valid NotificationType"})
public class UserNotification {

    public enum NotificationType { ORDER_UPDATE, PROMO, SYSTEM, REVIEW_REPLY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Category of the notification — drives the icon and routing in the UI.")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @DbvcsComment("Short notification title shown in the notification badge/list.")
    @Column(nullable = false, length = 150)
    private String title;

    @DbvcsComment("Full notification body text presented when the user opens the notification.")
    @Column(nullable = false, length = 500)
    private String message;

    @DbvcsComment("Whether the user has opened/acknowledged the notification.")
    @Column(nullable = false)
    private boolean read = false;

    @DbvcsComment("Timestamp when the notification was created and delivered. Immutable after insert.")
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @DbvcsComment("Timestamp when the user first read the notification. Null if unread.")
    private LocalDateTime readAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public UserNotification() {}

    public Long getId() { return id; }
    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
