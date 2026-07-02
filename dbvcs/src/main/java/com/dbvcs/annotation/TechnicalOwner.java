package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Identifies the engineering team or individual technically responsible for this entity.
 *
 * <pre>
 *   {@literal @}TechnicalOwner("Platform Engineering")
 *   public class Order { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface TechnicalOwner {
    /** Name of the owning team or person. */
    String value();
}
