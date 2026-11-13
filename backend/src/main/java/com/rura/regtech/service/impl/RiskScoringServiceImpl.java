package com.rura.regtech.service.impl;

import com.rura.regtech.entity.*;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.entity.enums.RiskLevel;
import com.rura.regtech.entity.enums.SubmissionStatus;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.*;
import com.rura.regtech.service.RiskScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RiskScoringServiceImpl implements RiskScoringService {

    private final OrganizationRepository organizationRepository;
    private final ComplianceRecordRepository complianceRecordRepository;
    private final SubmissionRepository submissionRepository;
    private final InspectionFindingRepository inspectionFindingRepository;
    private final CorrectiveActionRepository correctiveActionRepository;
    private final RiskScoreHistoryRepository riskScoreHistoryRepository;

    @Override
    public double calculateRiskScore(UUID organizationId) {
        log.info("Calculating risk score for organization: {}", organizationId);

        // Weight factors (total = 100%)
        double missedDeadlinesWeight = 0.40;
        double violationsWeight = 0.30;
        double lateSubmissionsWeight = 0.20;
        double openFindingsWeight = 0.10;

        // Calculate individual risk components
        double missedDeadlinesScore = calculateMissedDeadlinesScore(organizationId);
        double violationsScore = calculateViolationsScore(organizationId);
        double lateSubmissionsScore = calculateLateSubmissionsScore(organizationId);
        double openFindingsScore = calculateOpenFindingsScore(organizationId);

        // Weighted average
        double totalRiskScore = (missedDeadlinesScore * missedDeadlinesWeight) +
                (violationsScore * violationsWeight) +
                (lateSubmissionsScore * lateSubmissionsWeight) +
                (openFindingsScore * openFindingsWeight);

        log.info("Organization {} risk score: {} (Missed: {}, Violations: {}, Late: {}, Findings: {})",
                organizationId, totalRiskScore, missedDeadlinesScore, violationsScore,
                lateSubmissionsScore, openFindingsScore);

        return Math.min(100.0, Math.max(0.0, totalRiskScore));
    }

    private double calculateMissedDeadlinesScore(UUID organizationId) {
        List<ComplianceRecord> records = complianceRecordRepository.findByOrganizationId(organizationId);
        if (records.isEmpty()) {
            return 0.0;
        }

        long missedDeadlines = records.stream()
                .filter(r -> r.getReportingPeriodEnd().isBefore(LocalDate.now()) &&
                        (r.getStatus() == ComplianceStatus.PENDING || r.getStatus() == ComplianceStatus.ESCALATED))
                .count();

        double missedPercentage = (double) missedDeadlines / records.size();
        return missedPercentage * 100.0;
    }

    private double calculateViolationsScore(UUID organizationId) {
        List<ComplianceRecord> records = complianceRecordRepository.findByOrganizationId(organizationId);
        if (records.isEmpty()) {
            return 0.0;
        }

        long violations = records.stream()
                .filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT)
                .count();

        double violationPercentage = (double) violations / records.size();
        return violationPercentage * 100.0;
    }

    private double calculateLateSubmissionsScore(UUID organizationId) {
        List<ComplianceRecord> records = complianceRecordRepository.findByOrganizationId(organizationId);
        if (records.isEmpty()) {
            return 0.0;
        }

        int lateSubmissions = 0;
        int totalSubmissions = 0;

        for (ComplianceRecord record : records) {
            List<Submission> submissions = submissionRepository.findByComplianceRecordId(record.getId());
            for (Submission sub : submissions) {
                if (sub.getSubmissionDate() != null) {
                    totalSubmissions++;
                    LocalDate submissionDate = sub.getSubmissionDate().toLocalDate();
                    if (submissionDate.isAfter(record.getReportingPeriodEnd())) {
                        lateSubmissions++;
                    }
                }
            }
        }

        if (totalSubmissions == 0) {
            return 0.0;
        }

        double latePercentage = (double) lateSubmissions / totalSubmissions;
        return latePercentage * 100.0;
    }

    private double calculateOpenFindingsScore(UUID organizationId) {
        // Count open inspection findings
        long openFindings = inspectionFindingRepository.findAll().stream()
                .filter(f -> {
                    if (f.getInspection() != null && f.getInspection().getOrganization() != null) {
                        return f.getInspection().getOrganization().getId().equals(organizationId);
                    }
                    return false;
                })
                .count();

        // Normalize: more than 5 open findings = 100 score
        double score = Math.min(100.0, (openFindings / 5.0) * 100.0);
        return score;
    }

    @Override
    public RiskLevel determineRiskLevel(double score) {
        if (score >= 70.0) {
            return RiskLevel.HIGH;
        } else if (score >= 40.0) {
            return RiskLevel.MEDIUM;
        } else {
            return RiskLevel.LOW;
        }
    }

    @Override
    @Transactional
    public void updateOrganizationRiskScore(UUID organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));

        double riskScore = calculateRiskScore(organizationId);
        RiskLevel riskLevel = determineRiskLevel(riskScore);

        organization.setRiskScore(riskScore);
        organization.setRiskLevel(riskLevel);
        organizationRepository.save(organization);

        // Save to history
        RiskScoreHistory history = RiskScoreHistory.builder()
                .organizationId(organizationId)
                .riskScore(riskScore)
                .riskLevel(riskLevel.name())
                .build();
        riskScoreHistoryRepository.save(history);

        log.info("Updated risk score for organization {}: {} ({})", organizationId, riskScore, riskLevel);
    }
}
