package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.ComplianceSnapshotResponse;
import com.rura.regtech.entity.*;
import com.rura.regtech.entity.enums.*;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.ComplianceRecordRepository;
import com.rura.regtech.repository.CorrectiveActionRepository;
import com.rura.regtech.repository.InspectionFindingRepository;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.repository.SubmissionRepository;
import com.rura.regtech.service.ComplianceSnapshotService;
import com.rura.regtech.service.ComplianceTrackingService;
import com.rura.regtech.service.PredictiveRiskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplianceSnapshotServiceImpl implements ComplianceSnapshotService {

        private final OrganizationRepository organizationRepository;
        private final ComplianceRecordRepository complianceRecordRepository;
        private final InspectionFindingRepository inspectionFindingRepository;
        private final CorrectiveActionRepository correctiveActionRepository;
        private final SubmissionRepository submissionRepository;
        private final ComplianceTrackingService complianceTrackingService;
        private final PredictiveRiskService predictiveRiskService;

        @Override
        @Transactional(readOnly = true)
        public ComplianceSnapshotResponse generateComplianceSnapshot(UUID organizationId) {
                log.info("Generating compliance snapshot for organization: {}", organizationId);

                Organization organization = organizationRepository.findById(organizationId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Organization not found: " + organizationId));

                // Calculate metrics
                double complianceScore = complianceTrackingService.computeComplianceScore(organizationId);

                List<ComplianceRecord> records = complianceRecordRepository.findByOrganizationId(organizationId);

                // Active violations (NON_COMPLIANT records)
                int activeViolations = (int) records.stream()
                                .filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT)
                                .count();

                // Open inspections (would need Inspection entity - using findings as proxy)
                int openInspections = (int) inspectionFindingRepository.findByInspection_Organization_Id(organizationId).stream()
                                .filter(f -> f.getInspection() != null &&
                                                f.getInspection().getStatus() == InspectionStatus.IN_PROGRESS)
                                .map(f -> f.getInspection().getId())
                                .distinct()
                                .count();

                // Open corrective actions
                int openCorrectiveActions = (int) correctiveActionRepository.findByOrganizationId(organizationId).stream()
                                .filter(a -> a.getStatus() == ActionStatus.OPEN
                                                || a.getStatus() == ActionStatus.OVERDUE)
                                .count();

                // Pending submissions
                int pendingSubmissions = (int) records.stream()
                                .flatMap(r -> submissionRepository.findByComplianceRecordId(r.getId()).stream())
                                .filter(s -> s.getStatus() == SubmissionStatus.DRAFT)
                                .count();

                // Highest escalation level
                int maxEscalationLevel = records.stream()
                                .mapToInt(ComplianceRecord::getEscalationLevel)
                                .max()
                                .orElse(0);

                // Predictive risk
                PredictiveRiskAssessment riskAssessment = predictiveRiskService.getLatestAssessment(organizationId);
                boolean likelyToFail = riskAssessment != null && riskAssessment.isLikelyToFail();
                String riskReasoning = riskAssessment != null ? riskAssessment.getReasoning()
                                : "No assessment available";

                ComplianceSnapshotResponse snapshot = new ComplianceSnapshotResponse(
                                organizationId,
                                organization.getName(),
                                complianceScore,
                                organization.getRiskLevel() != null ? organization.getRiskLevel() : RiskLevel.UNKNOWN,
                                organization.getRiskScore() != null ? organization.getRiskScore() : 0.0,
                                activeViolations,
                                openInspections,
                                openCorrectiveActions,
                                pendingSubmissions,
                                maxEscalationLevel,
                                likelyToFail,
                                riskReasoning);

                log.info("Generated compliance snapshot for organization {}: Score={}, Risk={}",
                                organizationId, complianceScore, organization.getRiskLevel());

                return snapshot;
        }
}
