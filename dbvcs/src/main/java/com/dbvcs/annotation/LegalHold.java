package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks an entity or field as being under legal hold — data must not be deleted.
 *
 * <pre>
 *   {@literal @}LegalHold("Pending litigation — Case #12345")
 *   public class Order { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface LegalHold {
    /** Reason or case reference for the legal hold. */
    String value() default "";
}
