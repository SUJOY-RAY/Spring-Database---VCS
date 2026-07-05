# dbvcs Annotation Cheat Sheet

> Quick reference for annotating a new `@Entity`. Copy-paste and fill in the values.

---

## Minimal compliant entity

```java
@Entity
@Table(name = "my_table")
@DbvcsComment("One-line description of what this table stores.")
@BusinessModule(name = ModuleType.PRODUCT)
@Domain(name = DomainType.INVENTORY)
@DataClassification(level = DataClassificationLevel.INTERNAL)
@Lifecycle(value = LifecycleStage.ACTIVE)
@BusinessOwner("Owning Team Name")
public class MyEntity { ... }
```

---

## Full entity template

```java
@Entity
@Table(name = "my_table")

// ── Documentation ─────────────────────────────────────────────────────────────
@DbvcsComment("What this table stores and its role in the system.")
@Remarks("Any implementation caveats, constraints, or important notes.")

// ── Business ──────────────────────────────────────────────────────────────────
@BusinessModule(name = "PRODUCT", description = "Optional detail")
@Submodule(name = "CATALOGUE")
@Domain(name = "INVENTORY", description = "Optional detail")
@Purpose(value = "Short purpose", description = "Longer explanation")
@Criticality(level = "HIGH", description = "Why this criticality level")
@BusinessOwner("Product Management Team")
@TechnicalOwner("Platform Engineering")
@DataSteward("Data Governance Team")

// ── Table type ────────────────────────────────────────────────────────────────
@TableType(type = "MASTER")
@MasterData               // or @TransactionalData / @LookupTable / @ReferenceData

// ── Integration ───────────────────────────────────────────────────────────────
@SourceSystem(name = "INTERNAL")
// @DerivedFrom("source_table")

// ── Classification & Access ───────────────────────────────────────────────────
@DataClassification(level = "INTERNAL")
@AccessLevel(level = "INTERNAL_ONLY")

// ── Privacy & GDPR ────────────────────────────────────────────────────────────
// @Pii("Contains personal data")
// @LawfulBasis(type = "CONTRACT")
// @ConsentRequired
// @LegalHold

// ── Security ──────────────────────────────────────────────────────────────────
// @Encrypted(algorithm = "AES256")

// ── Lifecycle & Operations ────────────────────────────────────────────────────
@Lifecycle(value = "ACTIVE")
@DataRetention(type = "INDEFINITE")
@UpdateStrategy(value = "UPSERT")
// @RefreshFrequency(value = "DAILY")
// @Versioned
@Auditable
@AuditColumns(createdAt = "created_at", updatedAt = "updated_at")

// ── Data Quality ──────────────────────────────────────────────────────────────
@DataQualityLevel(level = "HIGH")
@DataQuality(rules = {"Rule 1", "Rule 2"})

// ── API ───────────────────────────────────────────────────────────────────────
// @ApiExposed
// @PublicApi

public class MyEntity { ... }
```

---

## Field annotations

```java
// Identification
@BusinessKey           // human-meaningful business identifier
@NaturalKey            // externally meaningful key

// Search
@Searchable
@IndexedFor(purpose = "Reason this field is indexed")

// Documentation
@DbvcsComment("Column description")

// Privacy
@Pii("Direct identifier")
@PiiCategory(type = "EMAIL")
@LawfulBasis(type = "CONTRACT")

// Security
@Encrypted(algorithm = "AES256")
@Masking(strategy = "FULL")

// Classification
@DataClassification(level = "CONFIDENTIAL")
@AccessLevel(level = "ADMIN_ONLY")

// Quality
@DataQualityLevel(level = "HIGH")
@DataQuality(rules = {"Must not be null"})
```

---

## Enum quick reference

### ModuleType / `@BusinessModule(name)`
`ORDER` `CUSTOMER` `PRODUCT` `INVENTORY` `PAYMENT` `FINANCE` `SHIPPING` `NOTIFICATION` `AUTH` `REPORTING` `ADMIN` `OTHER`

### DomainType / `@Domain(name)`
`CUSTOMER` `FINANCE` `PAYMENTS` `ORDERS` `INVENTORY` `LOGISTICS` `COMPLIANCE` `SECURITY` `ANALYTICS` `OTHER`

### CriticalityLevel / `@Criticality(level)`
`LOW` `MEDIUM` `HIGH` `CRITICAL`

### TableTypeValue / `@TableType(type)`
`MASTER` `TRANSACTIONAL` `LOOKUP` `CONFIGURATION` `STAGING` `AUDIT` `HISTORY` `TEMPORARY`

### DataClassificationLevel / `@DataClassification(level)`
`PUBLIC` `INTERNAL` `CONFIDENTIAL` `RESTRICTED`

### AccessLevelValue / `@AccessLevel(level)`
`PUBLIC` `INTERNAL_ONLY` `RESTRICTED` `ADMIN_ONLY`

### LawfulBasisType / `@LawfulBasis(type)`
`CONSENT` `CONTRACT` `LEGAL_OBLIGATION` `VITAL_INTERESTS` `PUBLIC_TASK` `LEGITIMATE_INTERESTS`

### PiiType / `@PiiCategory(type)`
`NAME` `EMAIL` `PHONE` `ADDRESS` `DATE_OF_BIRTH` `NATIONAL_ID` `PASSPORT` `SSN` `IP_ADDRESS` `DEVICE_ID` `BIOMETRIC` `FINANCIAL` `HEALTH` `OTHER`

### EncryptionType / `@Encrypted(algorithm)`
`AES128` `AES256` `RSA` `BCRYPT` `ARGON2` `OTHER`

### MaskingStrategy / `@Masking(strategy)`
`FULL` `PARTIAL` `HASH` `TOKENIZE`

### RetentionType / `@DataRetention(type)`
`ONE_YEAR` `THREE_YEARS` `FIVE_YEARS` `SEVEN_YEARS` `TEN_YEARS` `INDEFINITE` `UNTIL_CONSENT_WITHDRAWN` `CUSTOM`

### LifecycleStage / `@Lifecycle(value)`
`ACTIVE` `DEPRECATED` `ARCHIVED` `LEGACY`

### UpdateType / `@UpdateStrategy(value)`
`APPEND_ONLY` `UPSERT` `FULL_REFRESH` `EVENT_DRIVEN`

### Frequency / `@RefreshFrequency(value)`
`REALTIME` `HOURLY` `DAILY` `WEEKLY` `MONTHLY`

### QualityLevel / `@DataQualityLevel(level)`
`LOW` `MEDIUM` `HIGH` `VERIFIED`
