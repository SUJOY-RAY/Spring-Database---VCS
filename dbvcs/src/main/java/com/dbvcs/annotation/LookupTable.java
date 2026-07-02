package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Convenience marker indicating this entity is a lookup / code table.
 * Equivalent to {@code @TableType(type = TableTypeValue.LOOKUP)}.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface LookupTable {
}
