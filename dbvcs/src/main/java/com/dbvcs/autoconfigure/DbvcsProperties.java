package com.dbvcs.autoconfigure;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for dbvcs.
 *
 * <p>Example {@code application.properties}:
 * <pre>
 *   dbvcs.enabled=true
 *   dbvcs.output-dir=dbvcs-schemas
 *   dbvcs.base-packages=com.example.myapp
 *   dbvcs.ui-path=/dbvcs
 * </pre>
 */
@ConfigurationProperties(prefix = "dbvcs")
public class DbvcsProperties {

    /** Whether dbvcs is active. Default: true */
    private boolean enabled = true;

    /**
     * Directory (relative to working dir) where versioned JSON snapshots are written.
     * Default: dbvcs-schemas
     */
    private String outputDir = "dbvcs-schemas";

    /**
     * Comma-separated list of base packages to scan for @Entity classes.
     * If empty, the full classpath is scanned (slower).
     */
    private String basePackages = "";

    /**
     * URL path where the schema browser UI is served.
     * Default: /dbvcs
     */
    private String uiPath = "/dbvcs";

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getOutputDir() { return outputDir; }
    public void setOutputDir(String outputDir) { this.outputDir = outputDir; }

    public String getBasePackages() { return basePackages; }
    public void setBasePackages(String basePackages) { this.basePackages = basePackages; }

    public String getUiPath() { return uiPath; }
    public void setUiPath(String uiPath) { this.uiPath = uiPath; }
}
