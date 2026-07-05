# dbvcs — Database Version Control for Spring Boot

> Automatic schema versioning, annotation-driven data governance, and a visual schema browser for Spring Boot JPA projects.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [How It Works](#how-it-works)
4. [Configuration Reference](#configuration-reference)
5. [Annotation Catalogue](#annotation-catalogue)
6. [Annotation Validation](#annotation-validation)
7. [REST API Reference](#rest-api-reference)
8. [Schema Snapshot Format](#schema-snapshot-format)
9. [Compile-Time Validation](#compile-time-validation)
10. [Extending dbvcs](#extending-dbvcs)
11. [Troubleshooting](#troubleshooting)

---

## Overview

dbvcs is a Spring Boot auto-configuration library that does three things automatically at application startup:

- **Scans** all `@Entity` classes in your configured packages
- **Diffs** the current schema against the last saved version
- **Persists** a new versioned JSON snapshot if anything changed

Each snapshot captures table names, columns, relations, and all dbvcs metadata annotations. A built-in REST API and browser UI let you browse and compare versions.

On top of schema versioning, dbvcs provides a **metadata annotation vocabulary** — 49 annotations covering data governance, classification, privacy, security, and lineage — and a **runtime validation system** that enforces which annotations are mandatory on which entities.

---

## Quick Start

### 1. Add the dependency

```xml
<dependency>
    <groupId>com.dbvcs</groupId>
    <artifactId>dbvcs</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 2. Configure your application

```properties
dbvcs.enabled=true
dbvcs.base-packages=com.example.myapp
dbvcs.output-dir=dbvcs-schemas
```

### 3. Start your application

dbvcs runs automatically. On first start you'll see:

```
[dbvcs] New schema version saved: schema-1.json (12 entities)
```

On subsequent starts with no changes:

```
[dbvcs] Schema unchanged. Current version: 1
```

### 4. Browse the schema

Open `http://localhost:8080/dbvcs` in your browser.

---

## How It Works

### Startup lifecycle

```
Application starts
       │
       ▼
Spring context fully refreshed (ContextRefreshedEvent)
       │
       ▼
EntityAnnotationValidator.validate()         ← checks required annotations
       │
       ├── ValidationRuleRegistry bean present? → use typed rules
       └── No bean?                            → use application.properties rules
       │
       ▼
ClasspathEntityFinder.findClassNames()       ← scans classpath for class files
       │
       ▼
EntityScanner.scan()                         ← loads each class, builds EntitySchema
       │
       ▼
SchemaVersionStore.latestVersion()           ← reads most recent snapshot from disk
       │
       ▼
SchemaDiffer.hasChanged()                    ← JSON-normalised comparison
       │
       ├── Changed → save new snapshot, print version number
       └── Unchanged → reuse previous snapshot, print current version
```

### Schema storage

Snapshots are saved as JSON files in the configured `output-dir`:

```
dbvcs-schemas/
├── schema-1.json
├── schema-2.json
└── schema-3.json
```

Each file is a complete point-in-time snapshot. Nothing is ever deleted.

### Author tracking

The author recorded in each snapshot is read from `git config user.name` and `user.email`. Falls back to the OS `user.name` if git is not available.

---

## Configuration Reference

All properties are under the `dbvcs` prefix.

### Core properties

| Property | Type | Default | Description |
|---|---|---|---|
| `dbvcs.enabled` | boolean | `true` | Enable or disable the entire library |
| `dbvcs.base-packages` | string | `""` | Comma-separated packages to scan. Empty = full classpath scan (slower) |
| `dbvcs.output-dir` | string | `dbvcs-schemas` | Directory for versioned JSON snapshots (relative to working dir) |
| `dbvcs.ui-path` | string | `/dbvcs` | URL path for the schema browser UI |

### Allowed-values properties

These lists define valid values for each annotation vocabulary. Defaults are built in; override them per-project.

| Property | Annotation | Default values |
|---|---|---|
| `dbvcs.allowed-values.modules` | `@BusinessModule(name)` | ORDER, CUSTOMER, PRODUCT, INVENTORY, PAYMENT, FINANCE, SHIPPING, NOTIFICATION, AUTH, REPORTING, ADMIN, OTHER |
| `dbvcs.allowed-values.domains` | `@Domain(name)` | CUSTOMER, FINANCE, PAYMENTS, ORDERS, INVENTORY, LOGISTICS, COMPLIANCE, SECURITY, ANALYTICS, OTHER |
| `dbvcs.allowed-values.criticality-levels` | `@Criticality(level)` | LOW, MEDIUM, HIGH, CRITICAL |
| `dbvcs.allowed-values.table-types` | `@TableType(type)` | MASTER, TRANSACTIONAL, LOOKUP, CONFIGURATION, STAGING, AUDIT, HISTORY, TEMPORARY |
| `dbvcs.allowed-values.source-systems` | `@SourceSystem(name)` | CRM, ERP, SAP, SALESFORCE, INTERNAL, MANUAL, API, ETL, LEGACY, OTHER |
| `dbvcs.allowed-values.data-classification-levels` | `@DataClassification(level)` | PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED |
| `dbvcs.allowed-values.access-levels` | `@AccessLevel(level)` | PUBLIC, INTERNAL_ONLY, RESTRICTED, ADMIN_ONLY |
| `dbvcs.allowed-values.pii-types` | `@PiiCategory(type)` | NAME, EMAIL, PHONE, ADDRESS, DATE_OF_BIRTH, NATIONAL_ID, PASSPORT, SSN, IP_ADDRESS, DEVICE_ID, BIOMETRIC, FINANCIAL, HEALTH, OTHER |
| `dbvcs.allowed-values.lawful-basis-types` | `@LawfulBasis(type)` | CONSENT, CONTRACT, LEGAL_OBLIGATION, VITAL_INTERESTS, PUBLIC_TASK, LEGITIMATE_INTERESTS |
| `dbvcs.allowed-values.encryption-types` | `@Encrypted(algorithm)` | AES128, AES256, RSA, BCRYPT, ARGON2, OTHER |
| `dbvcs.allowed-values.masking-strategies` | `@Masking(strategy)` | FULL, PARTIAL, HASH, TOKENIZE |
| `dbvcs.allowed-values.retention-types` | `@DataRetention(type)` | ONE_YEAR, THREE_YEARS, FIVE_YEARS, SEVEN_YEARS, TEN_YEARS, INDEFINITE, UNTIL_CONSENT_WITHDRAWN, CUSTOM |
| `dbvcs.allowed-values.lifecycle-stages` | `@Lifecycle(value)` | ACTIVE, DEPRECATED, ARCHIVED, LEGACY |
| `dbvcs.allowed-values.frequencies` | `@RefreshFrequency(value)` | REALTIME, HOURLY, DAILY, WEEKLY, MONTHLY |
| `dbvcs.allowed-values.update-types` | `@UpdateStrategy(value)` | APPEND_ONLY, UPSERT, FULL_REFRESH, EVENT_DRIVEN |
| `dbvcs.allowed-values.quality-levels` | `@DataQualityLevel(level)` | LOW, MEDIUM, HIGH, VERIFIED |

### Validation properties

Used as a fallback when no `ValidationRuleRegistry` bean is defined. See [Annotation Validation](#annotation-validation) for the bean approach.

| Property | Type | Default | Description |
|---|---|---|---|
| `dbvcs.validation.enabled` | boolean | `false` | Enable runtime annotation checking |
| `dbvcs.validation.fail-on-violation` | boolean | `false` | Fail startup on violations (false = warn only) |
| `dbvcs.validation.required-annotations` | list | `[]` | Annotation simple names required on every entity |
| `dbvcs.validation.rules[n].package-pattern` | string | — | Package pattern for this rule (`com.example.**`, `com.example.*`, or exact class name) |
| `dbvcs.validation.rules[n].required-annotations` | list | `[]` | Annotation names required for entities matching this pattern |

```properties
# Example
dbvcs.validation.enabled=true
dbvcs.validation.fail-on-violation=true
dbvcs.validation.required-annotations=Domain,BusinessModule,DataClassification,Lifecycle

dbvcs.validation.rules[0].package-pattern=com.example.entity.auth.**
dbvcs.validation.rules[0].required-annotations=Pii,LawfulBasis,DataRetention
```

---

## Annotation Catalogue

All annotations are in `com.dbvcs.annotation`. Import with:

```java
import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
```

### Documentation

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@DbvcsComment` | Type, Field | `value` (String, required) | Human-readable description of the table or column |
| `@Remarks` | Type, Field | `value` (String, required) | Additional implementation notes or caveats |

### Business & Ownership

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@BusinessModule` | Type | `name` (String, required), `description` (String, optional) | Business module this entity belongs to |
| `@Submodule` | Type | `name` (String, required), `description` (String, optional) | Sub-module within a business module |
| `@Domain` | Type | `name` (String, required), `description` (String, optional) | Business domain (e.g. CUSTOMER, FINANCE) |
| `@Purpose` | Type | `value` (String, required), `description` (String, optional) | Why this entity exists |
| `@Criticality` | Type | `level` (String, required), `description` (String, optional) | Business criticality: LOW, MEDIUM, HIGH, CRITICAL |
| `@BusinessOwner` | Type | `value` (String, required) | Team or person responsible for business rules |
| `@TechnicalOwner` | Type | `value` (String, required) | Team or person responsible for technical maintenance |
| `@DataSteward` | Type | `value` (String, required) | Data governance steward |

### Table Classification

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@TableType` | Type | `type` (String, required), `description` (String, optional) | MASTER, TRANSACTIONAL, LOOKUP, etc. |
| `@MasterData` | Type | — | Marks entity as master/reference data |
| `@TransactionalData` | Type | — | Marks entity as transactional |
| `@LookupTable` | Type | — | Marks entity as a lookup/code table |
| `@ReferenceData` | Type | `value` (String, optional) | Marks entity as reference data with optional description |

### Integration & Lineage

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@SourceSystem` | Type, Field | `name` (String, required), `description` (String, optional) | Originating system (e.g. SAP, SALESFORCE) |
| `@Integration` | Type | `value` (String, required) | Integration pattern or system description |
| `@DerivedFrom` | Type, Field | `value` (String, required) | Source entity/field this data is derived from |
| `@Derived` | Type, Field | `expression` (String, required) | Derivation expression or rule |

### Classification & Access

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@DataClassification` | Type, Field | `level` (String, required), `description` (String, optional) | PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED |
| `@AccessLevel` | Type, Field | `level` (String, required) | PUBLIC, INTERNAL_ONLY, RESTRICTED, ADMIN_ONLY |

### Privacy & GDPR

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@Pii` | Type, Field | `value` (String, optional) | Marks entity/field as containing PII |
| `@PiiCategory` | Type, Field | `type` (String, required), `description` (String, optional) | PII category: NAME, EMAIL, PHONE, ADDRESS, etc. |
| `@Spd` | Type, Field | `value` (String, optional) | Marks as Special Personal Data (sensitive PII) |
| `@ContainsChildrenData` | Type, Field | `value` (String, optional) | Data relates to minors (COPPA/GDPR Art.8) |
| `@LawfulBasis` | Type, Field | `type` (String, required), `description` (String, optional) | GDPR lawful basis: CONSENT, CONTRACT, LEGITIMATE_INTERESTS, etc. |
| `@ConsentRequired` | Type, Field | `value` (String, optional) | Explicit user consent required |
| `@LegalHold` | Type, Field | `value` (String, optional) | Data is under legal hold; do not purge |

### Security

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@Encrypted` | Type, Field | `algorithm` (String, required) | Encryption algorithm: AES128, AES256, RSA, BCRYPT, ARGON2 |
| `@Masking` | Type, Field | `strategy` (String, required) | Masking strategy: FULL, PARTIAL, HASH, TOKENIZE |

### Lifecycle & Operations

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@DataRetention` | Type | `type` (String, required), `description` (String, optional) | Retention period: ONE_YEAR through INDEFINITE |
| `@Lifecycle` | Type | `value` (String, required) | Stage: ACTIVE, DEPRECATED, ARCHIVED, LEGACY |
| `@DeprecatedSince` | Type | `version` (String, required), `replacement` (String, optional) | When deprecated and what replaces it |
| `@UpdateStrategy` | Type | `value` (String, required) | APPEND_ONLY, UPSERT, FULL_REFRESH, EVENT_DRIVEN |
| `@RefreshFrequency` | Type | `value` (String, required) | REALTIME, HOURLY, DAILY, WEEKLY, MONTHLY |
| `@Versioned` | Type | — | Entity rows are versioned (optimistic lock / history table) |
| `@Auditable` | Type | — | Entity has audit tracking (created/updated by/at) |
| `@AuditColumns` | Type | `createdBy`, `updatedBy`, `createdAt`, `updatedAt` (String, optional) | Names of audit columns |
| `@AuditableEntity` | Type | — | Combined marker for auditable entities |

### Data Quality

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@DataQuality` | Type, Field | `rules` (String[], required) | Free-text data quality rules |
| `@DataQualityLevel` | Type, Field | `level` (String, required) | LOW, MEDIUM, HIGH, VERIFIED |

### Data Modeling

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@BusinessKey` | Field | — | Field is the business key (human-meaningful identifier) |
| `@NaturalKey` | Field | — | Field is a natural key (externally meaningful) |
| `@Searchable` | Field | — | Field is indexed/optimised for search |
| `@IndexedFor` | Field | `purpose` (String, required) | Describes why this field is indexed |

### API Exposure

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@ApiExposed` | Type, Field | — | Entity/field is exposed via an API |
| `@PublicApi` | Type, Field | — | Entity/field is part of the public API surface |

### Governance Meta-Annotations

| Annotation | Target | Attributes | Description |
|---|---|---|---|
| `@RequiredAnnotations` | Type | `value` (Class<? extends Annotation>[], required) | Declares which annotations must be present — enforced at compile time by `RequiredAnnotationProcessor` |
| `@GovernedEntity` | Type | `additionalRequired` (Class[], optional) | Convenience: requires `@Domain`, `@Purpose`, `@DataClassification`, `@Auditable` |

---

## Annotation Validation

dbvcs can enforce that all `@Entity` classes carry a required set of governance annotations. There are two ways to configure this.

### Option 1 — ValidationRuleRegistry bean (recommended)

Define a `@Configuration` class in your application. Rules are expressed as real `Class` references — compile-time safe, IDE-navigable, and refactor-friendly.

```java
@Configuration
public class DbvcsValidationConfig {

    @Bean
    public ValidationRuleRegistry dbvcsValidationRules() {
        return ValidationRuleRegistry.create()
                // Abort startup if any entity is missing required annotations
                .failOnViolation()

                // Every @Entity must have these
                .forAll(
                        Domain.class,
                        BusinessModule.class,
                        DataClassification.class,
                        Lifecycle.class,
                        BusinessOwner.class
                )

                // Auth entities additionally need these
                .forPackage("com.example.entity.auth.**",
                        Pii.class,
                        LawfulBasis.class,
                        DataRetention.class
                )

                // One specific entity has extra requirements
                .forEntity(User.class,
                        Purpose.class,
                        Criticality.class
                );
    }
}
```

When a `ValidationRuleRegistry` bean is present it takes **full priority** over any `dbvcs.validation.*` properties. The properties are the fallback.

#### Rule resolution order

1. All `forAll()` rules — applied to every entity, additive
2. `forPackage()` rules — checked in declaration order, first match wins, merged with global
3. `forEntity()` rules — exact class match, always merged regardless of package rule match

#### Package pattern syntax

| Pattern | Matches |
|---|---|
| `com.example.entity.**` | `com.example.entity` and all sub-packages recursively |
| `com.example.entity.*` | `com.example.entity` only (single level) |
| `com.example.entity` | Exact package name |
| `com.example.entity.User` | Exact class name |

#### Violation / warn modes

```java
.failOnViolation()   // throws EntityAnnotationViolationException at startup
.warnOnViolation()   // logs to stderr, application starts normally (default)
```

---

### Option 2 — application.properties (fallback)

Used when no `ValidationRuleRegistry` bean is defined.

```properties
dbvcs.validation.enabled=true
dbvcs.validation.fail-on-violation=true

# Annotations required on every entity (simple class names)
dbvcs.validation.required-annotations=Domain,BusinessModule,DataClassification,Lifecycle

# Package-specific additional requirements
dbvcs.validation.rules[0].package-pattern=com.example.entity.auth.**
dbvcs.validation.rules[0].required-annotations=Pii,LawfulBasis
```

> **Note:** Annotation names are simple class names (e.g. `Domain`, not `com.dbvcs.annotation.Domain`). A typo silently skips the check — this is why the bean approach is preferred.

---

### Violation output

When violations are found the report looks like:

```
[dbvcs] ─────────────────────────────────────────────────────
[dbvcs] ANNOTATION VALIDATION FAILED (rules via: registry bean)
[dbvcs] 2 entities missing required annotations:
[dbvcs] ─────────────────────────────────────────────────────
[dbvcs]  ✗ com.example.entity.Category
[dbvcs]      missing: @Domain
[dbvcs]      missing: @BusinessModule
[dbvcs]  ✗ com.example.entity.UserSession
[dbvcs]      missing: @DataClassification
[dbvcs] ─────────────────────────────────────────────────────
```

---

## REST API Reference

All endpoints are under `/dbvcs/api`. The UI at `/dbvcs` consumes these endpoints.

### GET /dbvcs/api/versions

Returns a summary list of all saved schema versions.

**Response**
```json
[
  { "version": 1, "timestamp": "2026-07-01T10:00:00", "author": "Jane Smith <jane@example.com>", "entityCount": 12 },
  { "version": 2, "timestamp": "2026-07-02T14:30:00", "author": "Jane Smith <jane@example.com>", "entityCount": 13 }
]
```

---

### GET /dbvcs/api/versions/{version}

Returns the full schema snapshot for a specific version number.

**Path parameter:** `version` — integer version number

**Response:** Full `SchemaSnapshot` JSON (see [Schema Snapshot Format](#schema-snapshot-format))

---

### GET /dbvcs/api/versions/latest

Returns the most recently saved schema snapshot.

**Response:** Full `SchemaSnapshot` JSON

---

### GET /dbvcs/api/changelog/{version}

Returns a structured diff between version `{version}-1` and `{version}`.

**Path parameter:** `version` — version to compare against its predecessor (minimum: 2)

**Response**
```json
{
  "fromVersion": 1,
  "toVersion": 2,
  "addedEntities": ["OrderCoupon"],
  "removedEntities": [],
  "modifiedEntities": [
    {
      "entity": "Product",
      "addedFields": ["discountPrice"],
      "removedFields": [],
      "modifiedFields": ["price"],
      "addedRelations": [],
      "removedRelations": []
    }
  ]
}
```

---

### GET /dbvcs

Serves the schema browser UI (HTML). Redirects to the static UI at `/dbvcs/`.

---

## Schema Snapshot Format

Each snapshot file (`schema-N.json`) has this structure:

```json
{
  "version": 2,
  "timestamp": "2026-07-02T14:30:00",
  "author": "Jane Smith <jane@example.com>",
  "entities": [
    {
      "className": "com.example.entity.Product",
      "simpleClassName": "Product",
      "tableName": "products",
      "comment": "Catalogue of all products available for purchase.",

      "module": "PRODUCT",
      "submodule": null,
      "domain": "INVENTORY",
      "criticalityLevel": "CRITICAL",
      "lifecycleStage": "ACTIVE",
      "dataClassification": "INTERNAL",
      "deprecated": false,

      "tags": ["Master Data", "Auditable", "API Exposed", "Public API"],

      "metadata": {
        "module.name": "PRODUCT",
        "domain.name": "INVENTORY",
        "businessOwner": "Product Management Team",
        "dataClassification.level": "INTERNAL",
        "lifecycle": "ACTIVE",
        "auditable": "true"
      },

      "fields": [
        {
          "name": "price",
          "javaType": "BigDecimal",
          "nullable": false,
          "id": false,
          "columnName": "price",
          "comment": "Retail selling price.",
          "metadata": {
            "dataClassification.level": "INTERNAL"
          }
        }
      ],

      "relations": [
        {
          "fieldName": "categories",
          "type": "MANY_TO_MANY",
          "targetEntity": "Category",
          "mappedBy": null,
          "optional": true,
          "joinColumnName": null
        }
      ]
    }
  ]
}
```

### Promoted fields

The following metadata values are always promoted to top-level fields on every `EntitySchema` for easy access by tooling:

| Field | Source metadata key |
|---|---|
| `module` | `module.name` |
| `submodule` | `submodule.name` |
| `domain` | `domain.name` |
| `criticalityLevel` | `criticality.level` |
| `lifecycleStage` | `lifecycle` |
| `dataClassification` | `dataClassification.level` |
| `deprecated` | presence of `deprecatedSince.version` |

### Tags

Tags are badge labels derived from boolean-flag annotations. They appear in declaration order:

`PII` · `SPD` · `Children Data` · `Consent Required` · `Legal Hold` · `Encrypted` · `Masked` · `Master Data` · `Transactional` · `Lookup` · `Reference Data` · `Auditable` · `Versioned` · `API Exposed` · `Public API` · `Deprecated`

---

## Compile-Time Validation

In addition to the runtime validator, dbvcs ships an **APT annotation processor** (`RequiredAnnotationProcessor`) that fires at compile time.

### Using @RequiredAnnotations directly

```java
@Entity
@RequiredAnnotations({ Domain.class, BusinessModule.class, DataClassification.class })
@Domain(name = "INVENTORY")
@BusinessModule(name = "PRODUCT")
@DataClassification(level = "INTERNAL")
public class Product { ... }
```

If any declared annotation is missing, the compiler emits an **error**:

```
error: Class 'Product' is missing required annotations: @DataClassification.
These annotations are mandatory for data governance compliance.
```

### Using @GovernedEntity (convenience)

`@GovernedEntity` is a pre-built meta-annotation that requires `@Domain`, `@Purpose`, `@DataClassification`, and `@Auditable`:

```java
@Entity
@GovernedEntity
@Domain(name = "CUSTOMER")
@Purpose(value = "Customer master data")
@DataClassification(level = "CONFIDENTIAL")
@Auditable
public class Customer { ... }
```

### Enabling the processor in your project

Add the dbvcs jar to your compiler's annotation processor path. In Maven:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <annotationProcessorPaths>
            <path>
                <groupId>com.dbvcs</groupId>
                <artifactId>dbvcs</artifactId>
                <version>1.0.0</version>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```

> **Note:** The dbvcs library itself builds with `<proc>none</proc>` to avoid processing its own annotations. Consumer projects should not set this flag.

---

## Extending dbvcs

### Overriding any bean

Every dbvcs bean is registered with `@ConditionalOnMissingBean`. Define your own bean of the same type to replace it:

```java
@Bean
public SchemaVersionStore myVersionStore() {
    return new SchemaVersionStore("/custom/path/schemas");
}

@Bean
public DbvcsService myDbvcsService(SchemaVersionStore store) {
    return new DbvcsService(store, "com.example");
}
```

### Custom annotation vocabularies

Add your own values to any allowed-values list without touching the library:

```properties
dbvcs.allowed-values.modules=ORDER,CUSTOMER,ECOMMERCE,B2B,WHOLESALE
dbvcs.allowed-values.domains=CUSTOMER,FINANCE,SUPPLY_CHAIN,MARKETPLACE
```

### Disabling selectively

```properties
# Disable everything
dbvcs.enabled=false

# Keep schema versioning, disable annotation validation
dbvcs.validation.enabled=false
```

---

## Troubleshooting

### Schema not updating

Check that `dbvcs.base-packages` points to the correct package. If left empty, the full classpath is scanned, which may miss classes in some configurations. Also check that the `output-dir` is writable.

---

### Application fails to start with `EntityAnnotationViolationException`

An entity is missing a required annotation. The error message lists exactly which entity and which annotations are missing. Either:

1. Add the missing annotations to the entity
2. Temporarily switch to warn-only mode: `.warnOnViolation()` in the registry bean, or `dbvcs.validation.fail-on-violation=false` in properties

---

### Author shows as `unknown`

Git is either not installed, not on `$PATH`, or the repository has no `user.name` configured. Set it with:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---
