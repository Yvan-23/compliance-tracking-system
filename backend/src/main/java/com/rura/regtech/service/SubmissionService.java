package com.rura.regtech.service;

import com.rura.regtech.dto.response.SubmissionResponse;
import com.rura.regtech.entity.Submission;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface SubmissionService {

    SubmissionResponse createDraftSubmission(UUID complianceRecordId, UUID userId, String initialComment);

    SubmissionResponse submitComplianceReport(UUID submissionId, UUID userId);

    SubmissionResponse approveSubmission(UUID submissionId, UUID reviewerId, String comment);

    SubmissionResponse rejectSubmission(UUID submissionId, UUID reviewerId, String reason);

    void uploadEvidence(UUID submissionId, MultipartFile file);

    boolean validateSubmission(UUID submissionId);

    String generateSubmissionReceipt(java.util.UUID submissionId);

    org.springframework.data.domain.Page<com.rura.regtech.dto.response.SubmissionResponse> getSubmissionsByComplianceRecord(
            java.util.UUID complianceRecordId, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<com.rura.regtech.dto.response.SubmissionResponse> getAllSubmissions(
            org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<com.rura.regtech.dto.response.SubmissionResponse> getSubmissionsByOrganization(
            UUID organizationId, org.springframework.data.domain.Pageable pageable);

    org.springframework.core.io.Resource downloadEvidence(UUID submissionId);
    
    byte[] downloadEvidenceBytes(UUID submissionId);

    SubmissionResponse reAnalyzeSubmission(UUID submissionId);

    java.util.Map<String, Object> reanalyzeAllSubmissions();
}
