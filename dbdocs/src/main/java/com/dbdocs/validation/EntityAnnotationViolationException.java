package com.dbdocs.validation;

/**
 * Thrown at application startup when one or more {@code @Entity} classes are missing
 * annotations required by the dbdocs validation rules and
 * {@code dbdocs.validation.fail-on-violation=true} is set.
 */
public class EntityAnnotationViolationException extends RuntimeException {

    public EntityAnnotationViolationException(String message) {
        super(message);
    }
}
