package com.dbvcs.annotation.enums;

/**
 * Suggested module name constants for use with {@link com.dbvcs.annotation.BusinessModule}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @BusinessModule(name = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.modules=ORDER,CUSTOMER,PRODUCT,MY_CUSTOM_MODULE
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 *
 * <p>Named {@code BusinessModule} (annotation) to avoid collision with {@code java.lang.Module}.
 */
public final class ModuleType {
    public static final String ORDER        = "ORDER";
    public static final String CUSTOMER     = "CUSTOMER";
    public static final String PRODUCT      = "PRODUCT";
    public static final String INVENTORY    = "INVENTORY";
    public static final String PAYMENT      = "PAYMENT";
    public static final String FINANCE      = "FINANCE";
    public static final String SHIPPING     = "SHIPPING";
    public static final String NOTIFICATION = "NOTIFICATION";
    public static final String AUTH         = "AUTH";
    public static final String REPORTING    = "REPORTING";
    public static final String ADMIN        = "ADMIN";
    public static final String OTHER        = "OTHER";

    private ModuleType() {}
}
