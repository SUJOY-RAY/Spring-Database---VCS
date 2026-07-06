# DBVCS Configuration Guide

DBVCS can be configured in two ways:

1. **Properties-based configuration** (application.properties / application.yml)
2. **Java config class** (programmatic)

## Properties-Based Configuration

### Enable/Disable DBVCS

```properties
dbvcs.enabled=true
```

### Validation Configuration

```properties
# Enable validation
dbvcs.validation.enabled=true

# Fail application startup if validation violations are found
dbvcs.validation.fail-on-violation=true

# Fail if required annotations are missing
dbvcs.validation.fail-on-missing-annotations=false
```

### Entity Scanning Configuration

```properties
# Enable entity scanning
dbvcs.scanning.enabled=true

# Comma-separated list of packages to scan (empty = scan all)
dbvcs.scanning.packages=com.example.entity,com.example.model

# Include test classes in scanning
dbvcs.scanning.include-tests=false
```

### REST API Configuration

```properties
# Enable REST API endpoints
dbvcs.api.enabled=true

# Base path for API endpoints
dbvcs.api.base-path=/api/dbvcs

# Enable API documentation
dbvcs.api.docs-enabled=true

# Return detailed error messages
dbvcs.api.detailed-errors=true
```

### Web UI Configuration

```properties
# Enable Web UI
dbvcs.ui.enabled=true

# URL path for the UI
dbvcs.ui.path=/dbvcs

# Enable dark mode by default
dbvcs.ui.dark-mode=false

# Maximum entities to display in sidebar
dbvcs.ui.max-entities-display=1000

# Enable inline search
dbvcs.ui.search-enabled=true
```

### Schema Versioning Configuration

```properties
# Enable schema versioning and changelog
dbvcs.versioning.enabled=false

# Storage backend: memory, file, or database
dbvcs.versioning.storage-backend=memory

# Directory for file-based storage
dbvcs.versioning.storage-dir=./dbvcs-versions
```

### Changelog Configuration

```properties
# Enable changelog tracking
dbvcs.changelog.enabled=true

# Track field-level changes
dbvcs.changelog.track-field-changes=true

# Track relationship changes
dbvcs.changelog.track-relation-changes=true

# Maximum number of entries to keep
dbvcs.changelog.max-entries=1000
```

### Complete Example (application.properties)

```properties
# DBVCS
dbvcs.enabled=true
dbvcs.validation.enabled=true
dbvcs.validation.fail-on-violation=true
dbvcs.scanning.enabled=true
dbvcs.scanning.packages=com.spring.mockspring.entity
dbvcs.api.enabled=true
dbvcs.ui.enabled=true
dbvcs.ui.path=/dbvcs
dbvcs.changelog.enabled=true
```

### Complete Example (application.yml)

```yaml
dbvcs:
  enabled: true
  
  validation:
    enabled: true
    fail-on-violation: true
    fail-on-missing-annotations: false
  
  scanning:
    enabled: true
    packages: "com.spring.mockspring.entity"
    include-tests: false
  
  api:
    enabled: true
    base-path: /api/dbvcs
    docs-enabled: true
    detailed-errors: true
  
  ui:
    enabled: true
    path: /dbvcs
    dark-mode: false
    max-entities-display: 1000
    search-enabled: true
  
  changelog:
    enabled: true
    track-field-changes: true
    track-relation-changes: true
```

## Java Configuration

For compile-time safety and IDE autocomplete, use a `@Configuration` class:

```java
@Configuration
public class DbvcsConfig {

    /**
     * Define validation rules using the fluent API.
     * This takes priority over property-based configuration.
     */
    @Bean
    public ValidationRuleRegistry dbvcsValidationRules() {
        return ValidationRuleRegistry.create()
                .failOnViolation()
                .forAll(EntityDescription.class)
                .forPackage("com.spring.mockspring.entity.**",
                            FieldDescription.class);
    }

    /**
     * Customize DBVCS properties programmatically.
     */
    @Bean
    public DbvcsProperties dbvcsProperties() {
        DbvcsProperties props = new DbvcsProperties();
        props.setEnabled(true);
        
        DbvcsProperties.Validation validation = new DbvcsProperties.Validation();
        validation.setEnabled(true);
        validation.setFailOnViolation(true);
        props.setValidation(validation);
        
        DbvcsProperties.Scanning scanning = new DbvcsProperties.Scanning();
        scanning.setPackages("com.spring.mockspring.entity");
        props.setScanning(scanning);
        
        return props;
    }
}
```

## Configuration Priority

Properties and configuration classes are merged with this priority:

1. **Java @Bean configuration** (highest priority)
2. **application.properties / application.yml**
3. **Built-in defaults** (lowest priority)

If you define a bean, it overrides property-based configuration.

## Profile-Specific Configuration

Use Spring profiles to have different configurations for different environments:

```properties
# application.properties (shared defaults)
dbvcs.enabled=true

# application-dev.properties (development profile)
dbvcs.validation.fail-on-violation=true
dbvcs.ui.dark-mode=true

# application-prod.properties (production profile)
dbvcs.validation.fail-on-violation=false
dbvcs.ui.path=/internal/dbvcs
dbvcs.api.detailed-errors=false
```

Run with: `--spring.profiles.active=dev` or `--spring.profiles.active=prod`

## Common Configuration Scenarios

### Development Setup (Full Debugging)

```yaml
dbvcs:
  enabled: true
  validation:
    enabled: true
    fail-on-violation: true
  scanning:
    enabled: true
    packages: "com.example.entity"
  api:
    enabled: true
    detailed-errors: true
  ui:
    enabled: true
    dark-mode: true
  changelog:
    enabled: true
```

### Production Setup (Minimal Overhead)

```yaml
dbvcs:
  enabled: true
  validation:
    enabled: false  # Skip validation in prod
  scanning:
    enabled: true
  api:
    enabled: true
    detailed-errors: false  # No error details
  ui:
    enabled: false  # Disable UI in prod
  changelog:
    enabled: true
    max-entries: 100  # Limit entries
```

### Minimal Setup (UI Only)

```yaml
dbvcs:
  enabled: true
  validation:
    enabled: false
  api:
    enabled: false
  ui:
    enabled: true
```

## Environment Variables

You can also use environment variables to override properties:

```bash
export DBVCS_ENABLED=true
export DBVCS_VALIDATION_ENABLED=true
export DBVCS_VALIDATION_FAIL_ON_VIOLATION=true
export DBVCS_SCANNING_PACKAGES=com.example.entity
```

Spring Boot automatically converts these to properties.
