package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares the assessed data quality level for this entity or field.
 *
 * <p>The {@code level} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.quality-levels} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: LOW, MEDIUM, HIGH, VERIFIED.
 *
 * <pre>
 *   {@literal @}DataQualityLevel(level = "HIGH")
 *   public class Product { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DataQualityLevel {
    /** The assessed quality level (project-specific string value). */
    String level();
}
