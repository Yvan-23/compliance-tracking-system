package com.rura.regtech.config;

import java.util.UUID;

public class TenantUtils {

    public static void assertTenantMatch(UUID entityTenantId, String errorMessage) {
        UUID currentTenant = TenantContext.getTenantId();
        if (currentTenant != null && entityTenantId != null && !currentTenant.equals(entityTenantId)) {
            throw new SecurityException(errorMessage != null ? errorMessage : "Access denied: tenant mismatch");
        }
    }

    public static boolean isTenantIsolationActive() {
        return TenantContext.getTenantId() != null;
    }

    public static UUID getCurrentTenantId() {
        return TenantContext.getTenantId();
    }

    public static boolean isGlobalAdmin() {
        UUID tenantId = TenantContext.getTenantId();
        return tenantId == null;
    }
}
