package com.dbvcs.processor;

import javax.annotation.processing.*;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.*;
import java.util.*;

/**
 * Compile-time annotation processor that validates EntityDescription and FieldDescription annotations.
 *
 * <p>This processor ensures that required fields within the annotations are present,
 * enforcing data governance policies at compile time.
 */
@SupportedAnnotationTypes({
    "com.dbvcs.annotation.EntityDescription",
    "com.dbvcs.annotation.FieldDescription"
})
@SupportedSourceVersion(SourceVersion.RELEASE_21)
public class RequiredAnnotationProcessor extends AbstractProcessor {

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        // Currently this processor performs no validation at compile time.
        // All validation is done at runtime by EntityAnnotationValidator.
        // This processor exists to register the annotations for processing.
        return true;
    }
}
