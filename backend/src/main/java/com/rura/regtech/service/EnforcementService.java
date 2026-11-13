package com.rura.regtech.service;

import java.util.UUID;

public interface EnforcementService {

    void issueCorrectiveAction(UUID findingId, String description, UUID issuedBy);

    void trackCorrectiveAction(UUID actionId);

    void submitCorrectiveActionEvidence(UUID actionId, String evidence, org.springframework.web.multipart.MultipartFile file);

    void markCorrectiveActionCompleted(UUID actionId, UUID completedBy, String evidence);

    com.rura.regtech.dto.response.CorrectiveActionResponse getCorrectiveAction(java.util.UUID actionId);

    org.springframework.data.domain.Page<com.rura.regtech.dto.response.CorrectiveActionResponse> getCorrectiveActionsByFinding(
            java.util.UUID findingId, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<com.rura.regtech.dto.response.CorrectiveActionResponse> getAllCorrectiveActions(
            org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<com.rura.regtech.dto.response.CorrectiveActionResponse> getCorrectiveActionsByOrganization(
            UUID organizationId, org.springframework.data.domain.Pageable pageable);

    com.rura.regtech.dto.response.PenaltyCalculationResponse calculatePenaltyDetails(java.util.UUID violationId);

    double calculatePenalty(java.util.UUID violationId);

    void issuePenalty(UUID violationId, double amount);

    void closeEnforcementCase(UUID caseId);

    void createEnforcementAction(UUID organizationId, UUID complianceRecordId, String actionType, String severity, Double penaltyAmount, String description, UUID issuedBy);
}
