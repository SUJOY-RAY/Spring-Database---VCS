package com.spring.mockspring.entity;

import com.dbvcs.annotation.DbvcsComment;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_notification")
@DbvcsComment("In-app notifications sent to users for order updates, promotions, system alerts, and review replies.")
public class UserNotification {

    public enum NotificationType { ORDER_UPDATE, PROMO, SYSTEM, REVIEW_REPLY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false)
    private boolean read = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

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
