package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Marks an entity or field as exposed via an API endpoint.
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ApiExposed {
}
