package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.SubmissionStatus;

import java.util.UUID;

public record SubmissionResponse(
                UUID id,
                UUID complianceRecordId,
                String complianceRecordTitle,
                UUID organizationId,
                String organizationName,
                UUID submittedById,
                String submittedByName,
                SubmissionStatus status,
                String reviewComment,
                String submissionDate,
                String fileUrl,
                String fileChecksum,
                String aiAnalysisStatus,
                String aiAnalysisDetails,
                Double aiScore,
                String extractedText,
                String documentSummary,
                String evidenceUrl) {
}
