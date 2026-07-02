package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Convenience marker indicating this entity holds transactional data.
 * Equivalent to {@code @TableType(type = TableTypeValue.TRANSACTIONAL)}.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface TransactionalData {
}
