package com.dbvcs.validation;

/**
 * Thrown at application startup when one or more {@code @Entity} classes are missing
 * annotations required by the dbvcs validation rules and
 * {@code dbvcs.validation.fail-on-violation=true} is set.
 */
public class EntityAnnotationViolationException extends RuntimeException {

    public EntityAnnotationViolationException(String message) {
        super(message);
    }
}
