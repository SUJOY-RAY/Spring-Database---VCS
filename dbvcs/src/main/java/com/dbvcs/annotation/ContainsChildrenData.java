package com.dbvcs.annotation;

import java.lang.annotation.*;

/**
 * Flags an entity or field as containing data belonging to minors.
 *
 * <pre>
 *   {@literal @}ContainsChildrenData("Contains data of minors under 13")
 *   public class UserProfile { ... }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ContainsChildrenData {
    /** Description clarifying the nature of children's data present. */
    String value() default "";
}
