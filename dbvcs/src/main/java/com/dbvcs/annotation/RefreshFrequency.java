package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Declares how often the data in this entity is refreshed or expected to be up to date.
 *
 * <p>The {@code value} is a free-form string. Allowed values for your project
 * can be configured via {@code dbvcs.allowed-values.frequencies} in
 * {@code application.properties} / {@code application.yml}.
 * Default values: REALTIME, HOURLY, DAILY, WEEKLY, MONTHLY.
 *
 * <pre>
 *   {@literal @}RefreshFrequency("DAILY")
 *   public class ProductCatalog { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RefreshFrequency {
    /** The data refresh frequency (project-specific string value). */
    String value();
}
