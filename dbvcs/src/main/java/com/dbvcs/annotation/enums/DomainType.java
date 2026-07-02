package com.dbvcs.annotation.enums;

/**
 * Suggested domain name constants for use with {@link com.dbvcs.annotation.Domain}.
 *
 * <p>These are the library's built-in defaults. You are <em>not</em> required to use them —
 * the {@code @Domain(name = ...)} attribute accepts any {@code String}.
 * To define your project's own allowed values, set:
 * <pre>
 *   dbvcs.allowed-values.domains=CUSTOMER,FINANCE,PAYMENTS,MY_DOMAIN
 * </pre>
 * in {@code application.properties} / {@code application.yml}.
 */
public final class DomainType {
    public static final String CUSTOMER  = "CUSTOMER";
    public static final String FINANCE   = "FINANCE";
    public static final String PAYMENTS  = "PAYMENTS";
    public static final String ORDERS    = "ORDERS";
    public static final String INVENTORY = "INVENTORY";
    public static final String LOGISTICS = "LOGISTICS";
    public static final String COMPLIANCE = "COMPLIANCE";
    public static final String SECURITY  = "SECURITY";
    public static final String ANALYTICS = "ANALYTICS";
    public static final String OTHER     = "OTHER";

    private DomainType() {}
}
