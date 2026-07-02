package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Describes how data flows into or out of this entity via an external integration.
 *
 * <pre>
 *   {@literal @}Integration("Data fetched from SAP via nightly batch")
 *   public class Product { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Integration {
    /** Description of the integration. */
    String value();
}
