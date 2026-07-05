package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks an entity as governed by data governance policies.
 * 
 * <p>When applied to a class, it enforces that the class must have:
 * <ul>
 *   <li>{@link Domain} - Business domain</li>
 *   <li>{@link Purpose} - Business purpose</li>
 *   <li>{@link DataClassification} - Data classification level</li>
 *   <li>{@link Auditable} - Audit tracking</li>
 * </ul>
 *
 * <p>This is a convenience annotation that combines {@link RequiredAnnotations}
 * with sensible defaults for governed entities.
 *
 * <pre>
 *   {@literal @}GovernedEntity
 *   {@literal @}Domain(name = "CUSTOMER")
 *   {@literal @}Purpose(value = "Customer master data")
 *   {@literal @}DataClassification(level = "INTERNAL")
 *   {@literal @}Auditable
 *   public class Customer { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@RequiredAnnotations({
    Domain.class,
    Purpose.class,
    DataClassification.class,
    Auditable.class
})
public @interface GovernedEntity {
    /**
     * Optional additional annotations that must be present.
     * Used to extend the base set of required annotations.
     */
    Class<? extends Annotation>[] additionalRequired() default {};
}
