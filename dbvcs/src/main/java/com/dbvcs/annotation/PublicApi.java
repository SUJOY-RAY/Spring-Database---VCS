package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Indicates that this entity or field is exposed via a <em>public</em> API
 * (i.e. accessible to external consumers or third parties).
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface PublicApi {
}
