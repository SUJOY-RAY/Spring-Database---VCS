package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks an entity as versioned — meaning a version/optimistic-locking mechanism is in place.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Versioned {
}
