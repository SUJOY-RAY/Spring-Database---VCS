package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Identifies the data steward responsible for quality and governance of this entity.
 *
 * <pre>
 *   {@literal @}DataSteward("Customer Data Governance Team")
 *   public class User { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DataSteward {
    /** Name of the data steward or team. */
    String value();
}
