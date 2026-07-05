package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_session")
@DbvcsComment("Tracks active and historical login sessions per user, storing the auth token, client IP, user-agent, and expiry time.")
@BusinessModule(name = ModuleType.AUTH, description = "User authentication and session management")
@Domain(name = DomainType.SECURITY, description = "Security and access control domain")
@Purpose(value = "Tracks active user login sessions", description = "Records per-session auth tokens, expiry, and client metadata for authentication and audit purposes")
@Criticality(level = CriticalityLevel.HIGH, description = "Compromised sessions allow account takeover; must be tightly controlled")
@TableType(type = TableTypeValue.TRANSACTIONAL, description = "Transactional session lifecycle records")
@BusinessOwner("Platform Security Team")
@TechnicalOwner("Platform Engineering")
@DataClassification(level = DataClassificationLevel.CONFIDENTIAL, description = "Contains auth tokens and client IP addresses")
@AccessLevel(level = AccessLevelValue.RESTRICTED)
@Pii("Contains IP address which may identify an individual")
@LawfulBasis(type = LawfulBasisType.CONTRACT, description = "Processing necessary to maintain authenticated user sessions")
@DataRetention(type = RetentionType.ONE_YEAR, description = "Expired and revoked sessions purged after one year for audit trail")
@Lifecycle(value = LifecycleStage.ACTIVE)
@UpdateStrategy(value = UpdateType.APPEND_ONLY)
@Auditable
@DataQualityLevel(level = QualityLevel.HIGH)
@DataQuality(rules = {"token must be unique and non-null", "expiresAt must be after createdAt", "revokedAt must be null or after createdAt"})
@Remarks("Tokens must be generated with a cryptographically secure random source. Never log raw token values.")
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Opaque bearer token used to authenticate the session. Stored as a hash in production.")
    @BusinessKey
    @Encrypted(algorithm = EncryptionType.AES256)
    @Masking(strategy = MaskingStrategy.FULL)
    @DataClassification(level = DataClassificationLevel.RESTRICTED)
    @AccessLevel(level = AccessLevelValue.ADMIN_ONLY)
    @Column(nullable = false, unique = true, length = 128)
    private String token;

    @DbvcsComment("Client IP address at the time of login. Used for anomaly detection.")
    @Pii("IP address can identify an individual")
    @PiiCategory(type = PiiType.IP_ADDRESS, description = "Client IP at session creation")
    @DataClassification(level = DataClassificationLevel.CONFIDENTIAL)
    @Column(length = 45)
    private String ipAddress;

    @DbvcsComment("HTTP User-Agent string of the client browser or app.")
    @Column(length = 255)
    private String userAgent;

    @DbvcsComment("Timestamp when the session was created. Immutable after insert.")
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @DbvcsComment("Timestamp after which the session token is no longer valid.")
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @DbvcsComment("Timestamp when the session was explicitly revoked (logout or forced expiry). Null if still active.")
    private LocalDateTime revokedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public UserSession() {}

    public Long getId() { return id; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public LocalDateTime getRevokedAt() { return revokedAt; }
    public void setRevokedAt(LocalDateTime revokedAt) { this.revokedAt = revokedAt; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
