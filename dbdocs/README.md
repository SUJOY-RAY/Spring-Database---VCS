# dbdocs

DB schema version control and visual explorer for Spring Boot JPA projects.

`dbdocs` is a zero-config Spring Boot library that attaches to your existing JPA entities, captures a versioned snapshot of your schema at every startup, detects changes between runs, validates annotation coverage, and serves a built-in browser UI with wiki-style docs, an ER diagram, and a changelog — all without touching your application code beyond adding annotations.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Annotations](#annotations)
  - [@EntityMetadata](#entitymetadata)
  - [@FieldMetadata](#fieldmetadata)
  - [Constant Classes](#constant-classes)
- [Configuration](#configuration)
- [Validation](#validation)
  - [Properties-Based Validation](#properties-based-validation)
  - [Registry-Based Validation](#registry-based-validation)
- [Schema Versioning](#schema-versioning)
- [REST API](#rest-api)
- [Browser UI](#browser-ui)
- [Advanced Topics](#advanced-topics)

---

## Installation

Add the library to your Spring Boot project. All Spring, JPA, and Jackson dependencies are declared `provided`, so the library picks up whatever versions your application already uses.

**Maven**
```xml
<dependency>
    <groupId>com.dbdocs</groupId>
    <artifactId>dbdocs</artifactId>
    <version>1.0.0</version>
</dependency>
```

**Gradle**
```groovy
implementation 'com.dbdocs:dbdocs:1.0.0'
```

**Requirements**

| Requirement | Minimum version |
|---|---|
| Java | 21 |
| Spring Boot | 4.1.0 |
| Jakarta Persistence | (provided by your app) |
| Spring Web MVC | (provided by your app) |

---

## Quick Start

1. Add the dependency.
2. Start your application — the UI is live at `http://localhost:8080/dbdocs/`.

No `@EnableDbdocs`, no XML, no extra beans required. Auto-configuration activates whenever the library is on the classpath of a web application.

To annotate an entity with governance metadata:

```java
import com.dbdocs.annotation.*;

@Entity
@Table(name = "orders")
@EntityMetadata(
    description     = "Customer purchase orders",
    domain          = "Commerce",
    type            = EntityType.TRANSACTIONAL,
    criticality     = CriticalityLevel.HIGH,
    classification  = DataClassification.CONFIDENTIAL,
    auditable       = true
)
public class Order {

    @Id
    @FieldMetadata(description = "Surrogate primary key", dataType = FieldDataType.UUID)
    private UUID id;

    @FieldMetadata(
        description  = "Buyer identity",
        pii          = true,
        piiCategory  = PiiCategory.NAME,
        classification = DataClassification.CONFIDENTIAL
    )
    private String customerName;

    // ...
}
```

---

## How It Works

At every application startup, `dbdocs` runs the following pipeline inside a `ContextRefreshedEvent` listener:

```
1. Validate annotation coverage   (optional, configurable)
2. Scan classpath for @Entity classes
3. Extract fields, relations, and annotation metadata
4. Compare against the previous snapshot (diff)
5. Persist a new versioned snapshot if the schema changed
6. Serve the result over REST + the browser UI
```

Steps 2–5 are performed by `DbvcsService`, which orchestrates `ClasspathEntityFinder`, `EntityScanner`, `SchemaDiffer`, and `SchemaVersionStore`. The listener is guarded by an `AtomicBoolean` to prevent double-firing when both a root and a web `ApplicationContext` refresh.

---

## Annotations

### `@EntityMetadata`

Applied at the **class** level on any JPA `@Entity`. All attributes except `description` are optional.

```java
@EntityMetadata(
    description      = "...",   // required — human-readable purpose of the entity
    domain           = "",      // business domain (e.g. "Commerce", "Identity")
    type             = "",      // see EntityType constants
    classification   = "",      // see DataClassification constants
    criticality      = "",      // see CriticalityLevel constants
    retention        = "",      // see DataRetentionPolicy constants
    refreshFrequency = "",      // see RefreshFrequency constants
    sourceSystem     = "",      // upstream system that owns or feeds this data
    submodule        = "",      // sub-area within the domain
    integration      = "",      // external integration point
    accessLevel      = "",      // see AccessLevel constants
    auditable        = false,   // whether changes to rows are audit-logged
    versioned        = false,   // whether rows carry a version/history
    publicApi        = false,   // whether this entity is exposed through a public API
    consentRequired  = false    // whether reading/writing requires user consent
)
```

### `@FieldMetadata`

Applied at the **field** level. All attributes except `description` are optional.

```java
@FieldMetadata(
    description    = "...",   // required — what this field stores
    dataType       = "",      // see FieldDataType constants
    domain         = "",      // business domain override for this field
    classification = "",      // see DataClassification constants
    pii            = false,   // marks this field as personally identifiable
    piiCategory    = "",      // see PiiCategory constants (used when pii = true)
    encryption     = "",      // see EncryptionType constants
    searchable     = "",      // see SearchStrategy constants
    indexStrategy  = "",      // see IndexStrategy constants
    updateStrategy = "",      // see UpdateStrategy constants
    accessLevel    = "",      // see AccessLevel constants
    transactional  = false,   // whether writes to this field participate in transactions
    audited        = false,   // whether changes to this field are individually audit-logged
    consentRequired = false   // whether reading this field requires user consent
)
```

### Constant Classes

Use these constants as string values for the annotation attributes above. All classes are `final` with a private constructor — they serve as namespaced string enums.

#### `AccessLevel`

| Constant | Value |
|---|---|
| `PUBLIC` | `"PUBLIC"` |
| `INTERNAL` | `"INTERNAL"` |
| `RESTRICTED` | `"RESTRICTED"` |
| `ADMIN_ONLY` | `"ADMIN_ONLY"` |

#### `CriticalityLevel`

| Constant | Value |
|---|---|
| `LOW` | `"LOW"` |
| `MEDIUM` | `"MEDIUM"` |
| `HIGH` | `"HIGH"` |
| `CRITICAL` | `"CRITICAL"` |

#### `DataClassification`

| Constant | Value |
|---|---|
| `PUBLIC` | `"PUBLIC"` |
| `INTERNAL` | `"INTERNAL"` |
| `CONFIDENTIAL` | `"CONFIDENTIAL"` |
| `RESTRICTED` | `"RESTRICTED"` |
| `SECRET` | `"SECRET"` |

#### `DataRetentionPolicy`

| Constant | Description |
|---|---|
| `PERMANENT` | Data is never deleted |
| `TEMPORARY` | Short-lived, deleted after use |
| `ANONYMISED` | PII stripped; records kept |
| `ONE_DAY` … `TEN_YEARS` | Duration-based retention windows |

#### `EncryptionType`

`AES128`, `AES256`, `RSA`, `BCRYPT`, `ARGON2`, `SHA256`, `SHA512`, `FPE` (format-preserving), `TOKENIZED`

#### `EntityType`

| Constant | Description |
|---|---|
| `MASTER` | Core reference data (e.g. Customer, Product) |
| `TRANSACTIONAL` | Event/transaction records (e.g. Order, Payment) |
| `DIMENSIONAL` | Analytics dimension tables |
| `AGGREGATE` | Computed/aggregated state |
| `STAGING` | Temporary import or ETL tables |
| `AUDIT` | Audit trail tables |
| `REFERENCE` | Static lookup / code tables |

#### `FieldDataType`

`STRING`, `INTEGER`, `LONG`, `DECIMAL`, `BOOLEAN`, `DATE`, `TIME`, `TIMESTAMP`, `UUID`, `BINARY`, `JSON`, `OBJECT`, `COLLECTION`, `ENUM`, `BIGINT`, `TEXT`

#### `IndexStrategy`

`NONE`, `PRIMARY`, `UNIQUE`, `INDEX`, `COMPOSITE`, `FULLTEXT`, `SPATIAL`, `PARTIAL`

#### `PiiCategory`

`NAME`, `EMAIL`, `PHONE`, `ADDRESS`, `DATE_OF_BIRTH`, `GOVERNMENT_ID`, `SSN`, `CREDIT_CARD`, `BANK_ACCOUNT`, `LOCATION`, `IP_ADDRESS`, `BIOMETRIC`, `HEALTH`, `OTHER`

#### `RefreshFrequency`

`REALTIME`, `NEAR_REALTIME`, `HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`, `ON_DEMAND`

#### `SearchStrategy`

`NONE`, `FULL_TEXT`, `EXACT`, `RANGE`, `PREFIX`, `FUZZY`

#### `UpdateStrategy`

`OPTIMISTIC`, `PESSIMISTIC`, `IMMUTABLE`, `LAST_WRITE`

---

## Configuration

All properties live under the `dbdocs` prefix in `application.properties` / `application.yml`.

```properties
# ── Core ──────────────────────────────────────────────────────────────────────
dbdocs.enabled=true                     # Set false to disable the entire library

# ── Scanning ──────────────────────────────────────────────────────────────────
dbdocs.scanning.enabled=true
dbdocs.scanning.packages=              # Comma-separated base packages to scan.
                                       # Defaults to the full classpath when empty.

# ── UI ────────────────────────────────────────────────────────────────────────
dbdocs.ui.path=/dbdocs                 # Mount path for the browser UI

# ── Versioning ────────────────────────────────────────────────────────────────
dbdocs.versioning.enabled=false        # true = write schema-N.json files to disk
dbdocs.versioning.storage-dir=./dbdocs-versions
dbdocs.versioning.max-versions=0       # 0 = keep all versions; N = keep last N

# ── Validation ────────────────────────────────────────────────────────────────
dbdocs.validation.enabled=true
dbdocs.validation.fail-on-violation=false   # true = throw at startup on violation

# Require specific @EntityMetadata attributes to be non-empty on every entity:
dbdocs.validation.entity.required-attributes=description,domain,criticality

# Require specific @FieldMetadata attributes to be non-empty on every annotated field:
dbdocs.validation.field.required-attributes=description,dataType

# ── Changelog ─────────────────────────────────────────────────────────────────
dbdocs.changelog.enabled=true
```

---

## Validation

`dbdocs` can enforce annotation coverage at startup — ensuring every entity (and optionally every field) carries the metadata your team requires.

### Properties-Based Validation

The simplest mode. Specify comma-separated attribute names that must be present and non-empty on every entity or field:

```properties
dbdocs.validation.enabled=true
dbdocs.validation.fail-on-violation=false
dbdocs.validation.entity.required-attributes=description,domain,criticality
dbdocs.validation.field.required-attributes=description,dataType
```

When `fail-on-violation=false` (default), violations print a formatted warning to stdout. When `true`, an `EntityAnnotationViolationException` is thrown and the application will not start.

### Registry-Based Validation

For type-safe, fine-grained rules, define a `ValidationRuleRegistry` bean. When present it takes **complete priority** over the properties-based configuration.

```java
@Configuration
public class DbdocsValidationConfig {

    @Bean
    public ValidationRuleRegistry validationRules() {
        return ValidationRuleRegistry.create()
            .failOnViolation()

            // Every @Entity must have @EntityMetadata
            .forAll(EntityMetadata.class)

            // Entities in com.example.core and sub-packages must also have description + domain
            .requireEntityAttributesFor("com.example.core.**",
                EntityAttributes.DESCRIPTION,
                EntityAttributes.DOMAIN)

            // PII-heavy package must declare criticality and classification
            .requireEntityAttributesFor("com.example.pii.**",
                EntityAttributes.CRITICALITY,
                EntityAttributes.CLASSIFICATION)

            // A specific entity has extra requirements
            .requireEntityAttributesFor(PaymentTransaction.class,
                EntityAttributes.RETENTION,
                EntityAttributes.ACCESS_LEVEL)

            // All @FieldMetadata must include description and dataType
            .requireFieldAttributes(
                FieldAttributes.DESCRIPTION,
                FieldAttributes.DATA_TYPE);
    }
}
```

**Package pattern syntax**

| Pattern | Matches |
|---|---|
| `com.example.**` | `com.example` and all sub-packages (recursive) |
| `com.example.*` | `com.example` direct package only |
| `com.example.Order` | Exact class match |
| `__GLOBAL__` | Every entity (used internally by `forAll`) |

---

## Schema Versioning

By default, snapshots are kept in memory only and discarded on restart. To persist them to disk, enable file versioning:

```properties
dbdocs.versioning.enabled=true
dbdocs.versioning.storage-dir=./dbdocs-versions
dbdocs.versioning.max-versions=10
```

On each startup:

1. The current entity list is scanned and normalized.
2. The latest saved snapshot is loaded (if any).
3. `SchemaDiffer` serializes both lists to canonical JSON (entities, fields, and relations sorted alphabetically) and compares them as strings.
4. If they differ (or no snapshot exists yet), a new `schema-<N>.json` file is written.
5. If `max-versions > 0`, the oldest files are pruned to stay within the limit.

Each snapshot file contains:

```json
{
  "version": 3,
  "capturedAt": "2025-11-14T09:22:01Z",
  "capturedBy": "Jane Smith <jane@example.com>",
  "entities": [ ... ]
}
```

`capturedBy` is resolved from `git config --get user.name` and `user.email`. If git is not available, `System.getProperty("user.name")` is used as a fallback.

---

## REST API

All endpoints are mounted at `/dbdocs/api/`.

### `GET /dbdocs/api/versions`

Returns the available snapshot version numbers and the latest version.

```json
{
  "versions": [1, 2, 3],
  "latest": 3
}
```

### `GET /dbdocs/api/versions/{version}`

Returns the full `SchemaSnapshot` for the given version number. Returns `404` if the version does not exist.

```json
{
  "version": 3,
  "capturedAt": "2025-11-14T09:22:01Z",
  "capturedBy": "Jane Smith <jane@example.com>",
  "entities": [
    {
      "className": "com.example.Order",
      "simpleClassName": "Order",
      "tableName": "orders",
      "fields": [ ... ],
      "relations": [ ... ],
      "metadata": {
        "description": "Customer purchase orders",
        "criticality": "HIGH",
        "classification": "CONFIDENTIAL"
      },
      "domain": "Commerce",
      "criticalityLevel": "HIGH",
      "dataClassification": "CONFIDENTIAL",
      "tags": ["Auditable"]
    }
  ]
}
```

### `GET /dbdocs/api/schema`

Returns the latest active `SchemaSnapshot`. Returns `204 No Content` if no snapshot is available.

### `GET /dbdocs/api/changelog`

Returns a list of changelog entries, newest first. Each entry describes what changed between two consecutive versions.

```json
[
  {
    "version": 3,
    "capturedAt": "2025-11-14T09:22:01Z",
    "capturedBy": "Jane Smith <jane@example.com>",
    "diff": {
      "added": [
        { "entity": "AuditLog", "summary": "New entity added" }
      ],
      "removed": [],
      "modified": [
        {
          "entity": "Order",
          "changes": [
            "+ field: shippingAddress (String, nullable)",
            "~ field: status: type changed STRING → ENUM",
            "- relation: oldRelation removed"
          ]
        }
      ]
    }
  }
]
```

Change prefixes: `+` added, `-` removed, `~` modified.

---

## Browser UI

Navigate to `http://localhost:8080/dbdocs/` (or your configured path) to open the UI. The UI is a self-contained single-page app served from the library's bundled static resources.

### Sidebar — Entity Tree

- Lists all scanned entities, grouped by domain, submodule, criticality, entity type, lifecycle stage, or source system.
- Search by entity name.
- Sort alphabetically or by criticality.
- Click any entity to open its detail view.

### Wiki Tab

Displays a wiki-style documentation page for the selected entity:

- Breadcrumb: domain → submodule → entity name
- Governance badges: tags derived from annotation attributes (`PII`, `Consent Required`, `Encrypted`, `Auditable`, `Versioned`, `Public API`)
- Metadata panel: all `@EntityMetadata` attributes rendered as key/value pairs
- Fields table: column name, Java type, SQL type, nullable, index strategy, and `@FieldMetadata` metadata
- Mini ER diagram: the entity and its direct neighbours
- Table References sub-tab: changelog scoped to this entity

The **Schema Overview** system page (shown when nothing is selected) renders a summary across all entities — criticality distribution, PII count, deprecated count, and a paginated "All Tables" list.

### Diagram Tab

Full-schema SVG entity-relationship diagram:

- Every entity is drawn as a card with its fields listed.
- Relations are animated, colour-coded lines (`ONE_TO_ONE`, `ONE_TO_MANY`, `MANY_TO_ONE`, `MANY_TO_MANY`).
- Entities are grouped in labelled boxes by domain/submodule.
- Pan with click-drag, zoom with the scroll wheel, reset/fit with toolbar buttons.

### Changelog Tab

System-wide version history:

- Expandable diff cards per version showing added, removed, and modified entities.
- Author and timestamp for each change.

---

## Advanced Topics

### Restricting the classpath scan

By default, `dbdocs` walks the entire classpath. For large applications this is unnecessary — restrict scanning to your own packages:

```properties
dbdocs.scanning.packages=com.example.domain,com.example.core
```

### Tags

The following tags are automatically derived from annotation attributes and surfaced in the UI and API:

| Tag | Condition |
|---|---|
| `PII` | Any field has `pii = true` |
| `Consent Required` | Entity or any field has `consentRequired = true` |
| `Encrypted` | Any field has a non-empty `encryption` attribute |
| `Auditable` | Entity has `auditable = true` |
| `Versioned` | Entity has `versioned = true` |
| `Public API` | Entity has `publicApi = true` |

### Disabling individual features

```properties
dbdocs.enabled=false              # Disable everything
dbdocs.scanning.enabled=false     # Disable scanning (no schema, no UI data)
dbdocs.validation.enabled=false   # Disable annotation validation
dbdocs.versioning.enabled=false   # Use in-memory store only (default)
dbdocs.changelog.enabled=false    # Disable changelog endpoint
```

### Annotation processor note

The library ships with a `RequiredAnnotationProcessor` registered in `META-INF/services`. It is a no-op stub — all validation is performed at runtime. When building the library itself, Maven uses `<proc>none</proc>` to prevent the processor from loading before its own compilation completes.
