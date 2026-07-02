package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks an entity as auditable — changes to its records are tracked.
 * Pair with {@link AuditColumns} to specify which columns hold audit metadata.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Auditable {
}
