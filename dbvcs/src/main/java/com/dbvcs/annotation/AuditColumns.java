package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Identifies the column names that store audit metadata on an entity.
 *
 * <pre>
 *   {@literal @}Auditable
 *   {@literal @}AuditColumns(createdBy = "created_by", updatedBy = "updated_by")
 *   public class Order { ... }
 * </pre>
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface AuditColumns {
    /** Column name storing the creator identifier. */
    String createdBy() default "created_by";

    /** Column name storing the last-update identifier. */
    String updatedBy() default "updated_by";

    /** Column name storing the creation timestamp. */
    String createdAt() default "created_at";

    /** Column name storing the last-update timestamp. */
    String updatedAt() default "updated_at";
}
