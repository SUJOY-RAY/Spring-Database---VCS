package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the originating source system for data in this entity.
 *
 * <p>The {@code name} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.source-systems} in
 * {@code application.properties} / {@code application.yml}.
 *
 * <pre>
 *   {@literal @}SourceSystem(name = "CRM", description = "Customer Management System")
 *   public class User { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface SourceSystem {
    /** The source system identifier (project-specific string value). */
    String name();

    /** Human-readable description of the source system. */
    String description() default "";
}
