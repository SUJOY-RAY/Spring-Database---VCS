package com.dbvcs.scanner;

import org.springframework.util.StringUtils;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.stream.Collectors;

/**
 * Finds all class names on the classpath, optionally filtered by base packages.
 *
 * <p>This is a lightweight alternative to a full classpath scanning framework.
 * It handles both exploded directory layouts (typical in IDEs and Maven Surefire)
 * and JAR files (typical in production fat-jars).
 */
public class ClasspathEntityFinder {

    /**
     * Returns all fully-qualified class names visible to {@code classLoader}.
     *
     * @param basePackages comma-separated list of base packages; empty means scan all
     * @param classLoader  the ClassLoader to search
     */
    public Set<String> findClassNames(String basePackages, ClassLoader classLoader) {
        Set<String> packageList = Arrays.stream(
                        basePackages.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .collect(Collectors.toSet());

        Set<String> result = new HashSet<>();

        try {
            Enumeration<URL> roots;
            if (packageList.isEmpty()) {
                roots = classLoader.getResources("");
            } else {
                // Collect resources for each package
                roots = Collections.emptyEnumeration();
                for (String pkg : packageList) {
                    String path = pkg.replace('.', '/');
                    Enumeration<URL> pkgRoots = classLoader.getResources(path);
                    while (pkgRoots.hasMoreElements()) {
                        URL url = pkgRoots.nextElement();
                        result.addAll(classNamesFromUrl(url, pkg, classLoader));
                    }
                }
                return result;
            }

            while (roots.hasMoreElements()) {
                URL url = roots.nextElement();
                result.addAll(classNamesFromUrl(url, "", classLoader));
            }
        } catch (IOException e) {
            // log and continue
        }

        return result;
    }

    private Set<String> classNamesFromUrl(URL url, String basePackage, ClassLoader classLoader) {
        String protocol = url.getProtocol();
        if ("file".equals(protocol)) {
            File file;
            try {
                file = new File(URLDecoder.decode(url.getPath(), StandardCharsets.UTF_8));
            } catch (Exception e) {
                return Set.of();
            }
            Set<String> names = new HashSet<>();
            String packagePrefix = basePackage.isEmpty() ? "" : basePackage + ".";
            scanDirectory(file, packagePrefix, names);
            return names;
        } else if ("jar".equals(protocol)) {
            return classNamesFromJarUrl(url, basePackage);
        }
        return Set.of();
    }

    private void scanDirectory(File dir, String packagePrefix, Set<String> result) {
        if (!dir.isDirectory()) return;
        File[] children = dir.listFiles();
        if (children == null) return;
        for (File child : children) {
            if (child.isDirectory()) {
                scanDirectory(child, packagePrefix + child.getName() + ".", result);
            } else if (child.getName().endsWith(".class")) {
                String className = packagePrefix + child.getName().replace(".class", "");
                if (!className.contains("$")) { // skip anonymous / inner classes
                    result.add(className);
                }
            }
        }
    }

    private Set<String> classNamesFromJarUrl(URL url, String basePackage) {
        Set<String> result = new HashSet<>();
        String jarPath = url.getPath();
        // jar:file:/path/to/foo.jar!/some/path -> extract /path/to/foo.jar
        if (jarPath.contains("!")) {
            jarPath = jarPath.substring("file:".length(), jarPath.indexOf('!'));
        }
        try (JarFile jar = new JarFile(URLDecoder.decode(jarPath, StandardCharsets.UTF_8))) {
            String pathPrefix = basePackage.replace('.', '/');
            Enumeration<JarEntry> entries = jar.entries();
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                String name = entry.getName();
                if (name.endsWith(".class") && !name.contains("$")
                        && (pathPrefix.isEmpty() || name.startsWith(pathPrefix))) {
                    result.add(name.replace('/', '.').replace(".class", ""));
                }
            }
        } catch (IOException ignored) {}
        return result;
    }
}
