package com.dbvcs.processor;

import com.dbvcs.annotation.RequiredAnnotations;

import javax.annotation.processing.*;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.*;
import javax.lang.model.type.TypeMirror;
import javax.tools.Diagnostic;
import java.util.*;

/**
 * Compile-time annotation processor that validates required annotations.
 *
 * <p>This processor ensures that all classes annotated with {@link RequiredAnnotations}
 * have all the specified required annotations present, enforcing data governance policies
 * at compile time.
 */
@SupportedAnnotationTypes("com.dbvcs.annotation.RequiredAnnotations")
@SupportedSourceVersion(SourceVersion.RELEASE_21)
public class RequiredAnnotationProcessor extends AbstractProcessor {

    private Messager messager;

    @Override
    public synchronized void init(ProcessingEnvironment processingEnv) {
        super.init(processingEnv);
        this.messager = processingEnv.getMessager();
    }

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        for (Element element : roundEnv.getElementsAnnotatedWith(RequiredAnnotations.class)) {
            if (element instanceof TypeElement typeElement) {
                processTypeElement(typeElement);
            }
        }
        return true;
    }

    private void processTypeElement(TypeElement typeElement) {
        // Skip annotation types themselves - only process actual entities
        if (typeElement.getKind() == ElementKind.ANNOTATION_TYPE) {
            return;
        }

        // Find the @RequiredAnnotations annotation
        AnnotationMirror requiredAnnotationsMirror = null;
        for (AnnotationMirror mirror : typeElement.getAnnotationMirrors()) {
            if (mirror.getAnnotationType().toString().equals("com.dbvcs.annotation.RequiredAnnotations")) {
                requiredAnnotationsMirror = mirror;
                break;
            }
        }

        if (requiredAnnotationsMirror == null) {
            return;
        }

        // Extract required annotation types from the @RequiredAnnotations value
        List<String> requiredAnnotationNames = extractRequiredAnnotationNames(requiredAnnotationsMirror);

        // Get all annotations present on the type
        Set<String> presentAnnotations = new HashSet<>();
        for (AnnotationMirror mirror : typeElement.getAnnotationMirrors()) {
            String annotationTypeName = mirror.getAnnotationType().toString();
            presentAnnotations.add(annotationTypeName);
        }

        // Check each required annotation
        List<String> missingAnnotations = new ArrayList<>();
        for (String requiredAnnotationName : requiredAnnotationNames) {
            if (!presentAnnotations.contains(requiredAnnotationName)) {
                // Extract simple name for better readability
                String simpleName = requiredAnnotationName.substring(requiredAnnotationName.lastIndexOf('.') + 1);
                missingAnnotations.add(simpleName);
            }
        }

        // Report errors for missing annotations
        if (!missingAnnotations.isEmpty()) {
            String missingList = String.join(", @", missingAnnotations);
            String message = String.format(
                "Class '%s' is missing required annotations: @%s. " +
                "These annotations are mandatory for data governance compliance.",
                typeElement.getSimpleName(),
                missingList
            );
            messager.printMessage(
                Diagnostic.Kind.ERROR,
                message,
                typeElement
            );
        }
    }

    private List<String> extractRequiredAnnotationNames(AnnotationMirror requiredAnnotationsMirror) {
        List<String> annotationNames = new ArrayList<>();

        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry : requiredAnnotationsMirror.getElementValues().entrySet()) {
            if (entry.getKey().getSimpleName().toString().equals("value")) {
                AnnotationValue value = entry.getValue();
                Object valueObj = value.getValue();
                
                if (valueObj instanceof List<?> list) {
                    for (Object item : list) {
                        if (item instanceof AnnotationValue av) {
                            Object classValue = av.getValue();
                            if (classValue instanceof TypeMirror typeMirror) {
                                annotationNames.add(typeMirror.toString());
                            }
                        }
                    }
                }
            }
        }

        return annotationNames;
    }
}
