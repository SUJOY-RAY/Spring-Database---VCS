package com.dbvcs.core;

import com.dbvcs.model.EntitySchema;
import com.dbvcs.model.SchemaSnapshot;
import com.dbvcs.scanner.ClasspathEntityFinder;
import com.dbvcs.scanner.EntityScanner;
import com.dbvcs.versioning.SchemaDiffer;
import com.dbvcs.versioning.SchemaVersionStore;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Set;

/**
 * Orchestrates the scan → diff → persist lifecycle.
 *
 * <p>Called once during application startup by the auto-configuration.
 */
public class DbvcsService {

    private final ClasspathEntityFinder finder;
    private final EntityScanner scanner;
    private final SchemaDiffer differ;
    private final SchemaVersionStore store;
    private final String basePackages;

    /** Holds the most recently active snapshot for the REST API. */
    private volatile SchemaSnapshot activeSnapshot;

    public DbvcsService(SchemaVersionStore store, String basePackages) {
        this.finder = new ClasspathEntityFinder();
        this.scanner = new EntityScanner();
        this.differ = new SchemaDiffer();
        this.store = store;
        this.basePackages = basePackages;
    }

    /**
     * Called at startup. Scans the classpath, compares with the latest saved version,
     * and persists a new snapshot if anything changed.
     */
    public void initialize(ClassLoader classLoader) {
        store.init();

        Set<String> classNames = finder.findClassNames(basePackages, classLoader);
        List<EntitySchema> entities = scanner.scan(classNames, classLoader);

        int latest = store.latestVersion();
        SchemaSnapshot previous = latest > 0 ? store.load(latest) : null;

        if (differ.hasChanged(previous, entities)) {
            int nextVersion = latest + 1;
            String author = resolveGitAuthor();
            SchemaSnapshot snapshot = new SchemaSnapshot(nextVersion, author, entities);
            store.save(snapshot);
            activeSnapshot = snapshot;
            System.out.println("[dbvcs] New schema version saved: schema-" + nextVersion + ".json"
                    + " (" + entities.size() + " entities)");
        } else {
            activeSnapshot = previous;
            System.out.println("[dbvcs] Schema unchanged. Current version: " + latest);
        }
    }

    /**
     * Reads the git user name and email from the local git config.
     * Falls back to the OS user name if git is not available.
     */
    private String resolveGitAuthor() {
        String name = runGitConfig("user.name");
        String email = runGitConfig("user.email");
        if (name != null && !name.isBlank()) {
            return email != null && !email.isBlank()
                    ? name + " <" + email + ">"
                    : name;
        }
        return System.getProperty("user.name", "unknown");
    }

    private String runGitConfig(String key) {
        try {
            Process p = new ProcessBuilder("git", "config", "--get", key)
                    .redirectErrorStream(true)
                    .start();
            try (BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line = br.readLine();
                p.waitFor();
                return (line != null) ? line.trim() : null;
            }
        } catch (Exception e) {
            return null;
        }
    }

    public SchemaSnapshot getActiveSnapshot() {
        return activeSnapshot;
    }

    public SchemaVersionStore getStore() {
        return store;
    }
}
