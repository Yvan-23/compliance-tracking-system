package com.rura.regtech.service.impl;

import com.rura.regtech.entity.*;
import com.rura.regtech.entity.enums.ActionStatus;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.entity.enums.RiskLevel;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.ComplianceRecordRepository;
import com.rura.regtech.repository.CorrectiveActionRepository;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.repository.PredictiveRiskAssessmentRepository;
import com.rura.regtech.service.PredictiveRiskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PredictiveRiskServiceImpl implements PredictiveRiskService {

    private final OrganizationRepository organizationRepository;
    private final ComplianceRecordRepository complianceRecordRepository;
    private final CorrectiveActionRepository correctiveActionRepository;
    private final PredictiveRiskAssessmentRepository assessmentRepository;
    private final com.rura.regtech.repository.RiskRuleRepository riskRuleRepository;

    @Override
    @Transactional
    public boolean evaluatePredictiveRisk(UUID organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));

        List<String> riskFactors = new ArrayList<>();
        double riskScore = 0.0;

        // Rule 1: Check if missed last 3 reporting cycles
        if (checkMissedLast3Cycles(organizationId)) {
            double weight = getRuleWeight("MISSED_LAST_3_CYCLES", 1.0);
            riskScore += weight;
            riskFactors.add("Missed last 3 reporting cycles (+" + weight + ")");
        }

        // Rule 2: Check if has 2+ open corrective actions
        if (checkOpenCorrectiveActions(organizationId)) {
            double weight = getRuleWeight("OPEN_CORRECTIVE_ACTIONS", 1.0);
            riskScore += weight;
            riskFactors.add("Has 2+ open corrective actions (+" + weight + ")");
        }

        // Rule 3: Check if has HIGH risk score
        if (organization.getRiskLevel() == RiskLevel.HIGH) {
            double weight = getRuleWeight("HIGH_RISK_LEVEL", 1.0);
            riskScore += weight;
            riskFactors.add("Has HIGH risk level (+" + weight + ")");
        }

        // Get configured threshold (default 2.0)
        double threshold = getRuleWeight("FAIL_THRESHOLD", 2.0);

        boolean likelyToFail = riskScore >= threshold;

        // Save assessment
        PredictiveRiskAssessment assessment = PredictiveRiskAssessment.builder()
                .organizationId(organizationId)
                .likelyToFail(likelyToFail)
                .reasoning(String.join("; ", riskFactors) + " [Score: " + riskScore + "/" + threshold + "]")
                .build();
        assessmentRepository.save(assessment);

        log.info("Predictive risk assessment for organization {}: {} (Score: {}, Threshold: {})",
                organizationId, likelyToFail ? "LIKELY_TO_FAIL" : "LOW_RISK", riskScore, threshold);

        return likelyToFail;
    }

    private double getRuleWeight(String ruleName, double defaultValue) {
        return riskRuleRepository.findByRuleName(ruleName)
                .map(com.rura.regtech.entity.RiskRule::getRiskWeight)
                .orElse(defaultValue);
    }

    private boolean checkMissedLast3Cycles(UUID organizationId) {
        List<ComplianceRecord> records = complianceRecordRepository.findByOrganizationId(organizationId);

        // Get last 3 records sorted by reporting period end date
        List<ComplianceRecord> last3Records = records.stream()
                .sorted((r1, r2) -> r2.getReportingPeriodEnd().compareTo(r1.getReportingPeriodEnd()))
                .limit(3)
                .toList();

        if (last3Records.size() < 3) {
            return false; // Not enough history
        }

        // Check if all 3 were missed (deadline passed and not compliant)
        return last3Records.stream()
                .allMatch(r -> r.getReportingPeriodEnd().isBefore(LocalDate.now()) &&
                        (r.getStatus() == ComplianceStatus.NON_COMPLIANT ||
                                r.getStatus() == ComplianceStatus.PENDING ||
                                r.getStatus() == ComplianceStatus.ESCALATED));
    }

    private boolean checkOpenCorrectiveActions(UUID organizationId) {
        long openActionsCount = correctiveActionRepository.findAll().stream()
                .filter(action -> {
                    if (action.getFinding() != null &&
                            action.getFinding().getInspection() != null &&
                            action.getFinding().getInspection().getOrganization() != null) {
                        return action.getFinding().getInspection().getOrganization().getId().equals(organizationId) &&
                                (action.getStatus() == ActionStatus.OPEN || action.getStatus() == ActionStatus.OVERDUE);
                    }
                    return false;
                })
                .count();

        return openActionsCount >= 2;
    }

    @Override
    public PredictiveRiskAssessment getLatestAssessment(UUID organizationId) {
        return assessmentRepository.findTopByOrganizationIdOrderByAssessedAtDesc(organizationId)
                .orElse(null);
    }
}
