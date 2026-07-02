package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Convenience marker indicating this entity holds master data.
 * Equivalent to {@code @TableType(type = TableTypeValue.MASTER)}.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface MasterData {
}
