package com.dbdocs.validation;

import java.lang.annotation.Annotation;
import java.util.Arrays;
import java.util.List;

/**
 * A single typed validation rule that maps a package pattern to a set of
 * required annotations, expressed as actual {@code Class} references rather
 * than strings.
 */
public final class ValidationRule {

    static final String GLOBAL = "__GLOBAL__";

    private final String packagePattern;
    private final List<Class<? extends Annotation>> required;

    private ValidationRule(String packagePattern, List<Class<? extends Annotation>> required) {
        this.packagePattern = packagePattern;
        this.required = List.copyOf(required);
    }

    @SafeVarargs
    static ValidationRule global(Class<? extends Annotation>... annotations) {
        return new ValidationRule(GLOBAL, Arrays.asList(annotations));
    }

    @SafeVarargs
    static ValidationRule forPackage(String pattern, Class<? extends Annotation>... annotations) {
        return new ValidationRule(pattern, Arrays.asList(annotations));
    }

    @SafeVarargs
    static ValidationRule forEntity(Class<?> entityClass, Class<? extends Annotation>... annotations) {
        return new ValidationRule(entityClass.getName(), Arrays.asList(annotations));
    }

    public String getPackagePattern() { return packagePattern; }
    public List<Class<? extends Annotation>> getRequired() { return required; }
    public boolean isGlobal() { return GLOBAL.equals(packagePattern); }

    // -------------------------------------------------------------------------
    // Attribute-level rule (scoped to a package pattern or class name)
    // -------------------------------------------------------------------------

    /**
     * A rule that requires specific annotation attributes to be non-empty,
     * scoped to a package pattern or exact class name.
     *
     * <p>A {@code null} pattern means the rule is global (applies to all entities).
     */
    public static final class AttributeRule {

        /** Sentinel meaning this rule applies to every entity. */
        static final String GLOBAL = "__GLOBAL__";

        private final String scope;       // package pattern, class name, or GLOBAL
        private final boolean forFields;  // true = @FieldMetadata attrs, false = @EntityMetadata attrs
        private final List<String> attributes;

        AttributeRule(String scope, boolean forFields, List<String> attributes) {
            this.scope = scope;
            this.forFields = forFields;
            this.attributes = List.copyOf(attributes);
        }

        public String getScope() { return scope; }
        public boolean isForFields() { return forFields; }
        public boolean isGlobal() { return GLOBAL.equals(scope); }
        public List<String> getAttributes() { return attributes; }
    }
}
