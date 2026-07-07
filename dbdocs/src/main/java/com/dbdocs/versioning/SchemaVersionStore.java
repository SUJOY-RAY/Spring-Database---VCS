package com.dbdocs.versioning;

import com.dbdocs.model.SchemaSnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads and writes versioned JSON snapshots to the configured output directory.
 *
 * <p>File naming convention: {@code schema-<N>.json} where N starts at 1.
 */
public class SchemaVersionStore {

    private static final Pattern VERSION_FILE = Pattern.compile("schema-(\\d+)\\.json");

    private final File outputDir;
    private final ObjectMapper mapper;
    private final int maxVersions;

    public SchemaVersionStore(String outputDirPath) {
        this(outputDirPath, 0);
    }

    public SchemaVersionStore(String outputDirPath, int maxVersions) {
        this.outputDir = new File(outputDirPath);
        this.mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
        this.maxVersions = maxVersions;
    }

    /**
     * Ensures the output directory exists.
     */
    public void init() {
        if (!outputDir.exists()) {
            outputDir.mkdirs();
        }
    }

    /**
     * Returns the highest existing version number, or 0 if none exist.
     */
    public int latestVersion() {
        String[] files = outputDir.list((dir, name) -> VERSION_FILE.matcher(name).matches());
        if (files == null || files.length == 0) return 0;
        int max = 0;
        for (String f : files) {
            Matcher m = VERSION_FILE.matcher(f);
            if (m.matches()) {
                max = Math.max(max, Integer.parseInt(m.group(1)));
            }
        }
        return max;
    }

    /**
     * Loads and returns the snapshot at the given version, or {@code null} if it doesn't exist.
     */
    public SchemaSnapshot load(int version) {
        File file = fileForVersion(version);
        if (!file.exists()) return null;
        try {
            return mapper.readValue(file, SchemaSnapshot.class);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load schema version " + version, e);
        }
    }

    /**
     * Writes a new snapshot file for the given version.
     * If maxVersions > 0, deletes the oldest files to stay within the limit.
     */
    public void save(SchemaSnapshot snapshot) {
        File file = fileForVersion(snapshot.getVersion());
        try {
            mapper.writeValue(file, snapshot);
        } catch (IOException e) {
            throw new RuntimeException("Failed to save schema version " + snapshot.getVersion(), e);
        }
        if (maxVersions > 0) {
            pruneOldVersions();
        }
    }

    private void pruneOldVersions() {
        List<Integer> versions = allVersions();
        int excess = versions.size() - maxVersions;
        for (int i = 0; i < excess; i++) {
            fileForVersion(versions.get(i)).delete();
        }
    }

    /**
     * Lists all available version numbers in ascending order.
     */
    public List<Integer> allVersions() {
        String[] files = outputDir.list((dir, name) -> VERSION_FILE.matcher(name).matches());
        if (files == null) return List.of();
        List<Integer> versions = new ArrayList<>();
        for (String f : files) {
            Matcher m = VERSION_FILE.matcher(f);
            if (m.matches()) versions.add(Integer.parseInt(m.group(1)));
        }
        versions.sort(Comparator.naturalOrder());
        return versions;
    }

    private File fileForVersion(int version) {
        return new File(outputDir, "schema-" + version + ".json");
    }
}
