package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Specifies which annotations must be present on a class.
 * This is used for compile-time validation to enforce data governance policies.
 *
 * <p>When applied to a class, the Java compiler will validate that all specified
 * required annotations are present at compile time.
 *
 * <pre>
 *   {@literal @}RequiredAnnotations({Domain.class, Purpose.class})
 *   {@literal @}Domain(name = "CUSTOMER")
 *   {@literal @}Purpose(value = "Customer data")
 *   public class User { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequiredAnnotations {
    /**
     * Array of annotation classes that must be present on the annotated class.
     */
    Class<? extends Annotation>[] value();
}
