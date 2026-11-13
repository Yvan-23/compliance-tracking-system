package com.rura.regtech.service;

import com.rura.regtech.entity.ComplianceRecord;

import java.time.LocalDate;
import java.util.UUID;

public interface ComplianceTrackingService {

    void initializeComplianceCycle(UUID organizationId);

    void calculateComplianceStatus(UUID complianceRecordId);

    double computeComplianceScore(UUID organizationId);

    void markAsNonCompliant(UUID complianceRecordId, String reason);

    void approveCompliance(UUID complianceRecordId, UUID userId);

    void revertCompliance(UUID complianceRecordId, UUID userId);

    void processWaiverRequest(UUID complianceRecordId, UUID userId, boolean approved, String comment);

    void generateComplianceSnapshot(UUID organizationId);

    void recalculateAllStatuses();

    UUID ensureComplianceRecord(UUID organizationId, UUID requirementId);

    com.rura.regtech.dto.response.ComplianceRecordResponse getComplianceRecordById(java.util.UUID id);

    org.springframework.data.domain.Page<com.rura.regtech.dto.response.ComplianceRecordResponse> getComplianceRecordsByOrganization(
            java.util.UUID organizationId, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<com.rura.regtech.dto.response.ComplianceRecordResponse> getAllComplianceRecords(
            org.springframework.data.domain.Pageable pageable);

    void reconcilePendingRecordsWithEvidence(UUID organizationId);
}
