package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks an entity as auditable with mandatory governance annotations.
 *
 * <p>This is a meta-annotation that automatically enforces these required annotations:
 * <ul>
 *   <li>{@link Domain} - Business domain classification</li>
 *   <li>{@link Purpose} - Business purpose statement</li>
 *   <li>{@link DataClassification} - Data sensitivity level</li>
 *   <li>{@link Auditable} - Enable audit tracking</li>
 * </ul>
 *
 * <p>Example usage:
 * <pre>
 *   {@literal @}AuditableEntity
 *   {@literal @}Domain(name = "ORDERS")
 *   {@literal @}Purpose(value = "Order processing")
 *   {@literal @}DataClassification(level = "CONFIDENTIAL")
 *   public class Order { ... }
 * </pre>
 *
 * <p>Attempting to use this annotation without all required annotations will
 * result in a compile-time error, ensuring data governance compliance.
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
public @interface AuditableEntity {
    /**
     * Optional additional required annotations beyond the base set.
     */
    Class<? extends Annotation>[] additionalRequired() default {};
}
