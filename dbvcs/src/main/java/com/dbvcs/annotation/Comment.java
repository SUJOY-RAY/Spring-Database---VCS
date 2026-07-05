package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Attaches a human-readable description to a JPA entity class or field.
 * dbvcs reads this at startup and stores it in the schema snapshot,
 * where it is surfaced in the Schema Explorer wiki view.
 *
 * <p>Usage on a class:
 * <pre>
 *   {@literal @}Entity
 *   {@literal @}DbvcsComment("Stores customer orders placed through the storefront.")
 *   public class Order { ... }
 * </pre>
 *
 * <p>Usage on a field:
 * <pre>
 *   {@literal @}DbvcsComment("ISO-4217 currency code for the order total.")
 *   private String currency;
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Comment {
    /** The description text to display in the schema explorer. */
    String value();
}
