# Spring-Database-VCS

Automatic schema versioning, metadata annotation governance, and a visual schema browser for Spring Boot JPA projects.

## Docs

- [User Manual & Full Reference](docs/README.md) — configuration, annotation catalogue, validation system, REST API, snapshot format, troubleshooting
- [Annotation Cheat Sheet](docs/ANNOTATION-CHEATSHEET.md) — copy-paste templates and enum quick reference

## Modules

| Module | Description |
|---|---|
| `dbvcs/` | The library — auto-configuration, annotations, scanner, validator, versioning, REST API |
| `mockspring/` | Demo Spring Boot app with 13 annotated JPA entities |

## Quick start

```properties
# application.properties
dbvcs.enabled=true
dbvcs.base-packages=com.example.myapp
dbvcs.output-dir=dbvcs-schemas
```

```xml
<!-- pom.xml -->
<dependency>
    <groupId>com.dbvcs</groupId>
    <artifactId>dbvcs</artifactId>
    <version>1.0.0</version>
</dependency>
```

Schema browser: `http://localhost:8080/dbvcs`
