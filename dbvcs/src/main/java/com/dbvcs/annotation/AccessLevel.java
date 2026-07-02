package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Restricts access to an entity or field to a specific audience level.
 *
 * <p>The {@code level} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.access-levels} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: PUBLIC, INTERNAL_ONLY, RESTRICTED, ADMIN_ONLY.
 *
 * <pre>
 *   {@literal @}AccessLevel(level = "INTERNAL_ONLY")
 *   public class AuditLog { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AccessLevel {
    /** Required access level (project-specific string value). */
    String level();
}
