package com.rura.regtech.service;

import com.rura.regtech.dto.response.ComplianceSnapshotResponse;

import java.util.UUID;

public interface ComplianceSnapshotService {

    /**
     * Generate comprehensive compliance snapshot for an organization
     * 
     * @param organizationId the organization id
     * @return compliance snapshot with all metrics
     */
    ComplianceSnapshotResponse generateComplianceSnapshot(UUID organizationId);
}
