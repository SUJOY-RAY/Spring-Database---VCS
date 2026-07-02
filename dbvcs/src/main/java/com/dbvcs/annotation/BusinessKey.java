package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks a field as the business key — a domain-meaningful identifier
 * used to identify records externally (distinct from the technical surrogate key).
 *
 * <pre>
 *   {@literal @}BusinessKey
 *   private String orderNumber;
 * </pre>
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface BusinessKey {
}
