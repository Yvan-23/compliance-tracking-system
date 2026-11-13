package com.rura.regtech.service.impl;

import com.rura.regtech.entity.Organization;
import com.rura.regtech.repository.AuditLogRepository;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.service.ComplianceRecalculationService;
import com.rura.regtech.service.ComplianceTrackingService;
import com.rura.regtech.service.EscalationService;
import com.rura.regtech.service.RiskScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplianceRecalculationServiceImpl implements ComplianceRecalculationService {

    private final OrganizationRepository organizationRepository;
    private final ComplianceTrackingService complianceTrackingService;
    private final RiskScoringService riskScoringService;
    private final EscalationService escalationService;
    private final AuditLogRepository auditLogRepository;

    @Override
    @Scheduled(cron = "0 0 0 * * ?") // Run at midnight daily
    @Transactional
    public void performNightlyRecalculation() {
        log.info("========== STARTING NIGHTLY COMPLIANCE RECALCULATION ==========");
        long startTime = System.currentTimeMillis();

        List<Organization> allOrganizations = organizationRepository.findAll();

        int organizationsProcessed = 0;
        int risksRecalculated = 0;
        int escalationsProcessed = 0;

        for (Organization organization : allOrganizations) {
            try {
                // 1. Recalculate compliance statuses
                complianceTrackingService.recalculateAllStatuses();

                // 2. Recalculate risk scores
                riskScoringService.updateOrganizationRiskScore(organization.getId());
                risksRecalculated++;

                organizationsProcessed++;
            } catch (Exception e) {
                log.error("Error processing organization {}", organization.getId(), e);
            }
        }

        // 3. Process escalations (runs once for all records)
        try {
            escalationService.processEscalations();
            escalationsProcessed = 1;
        } catch (Exception e) {
            log.error("Error processing escalations", e);
        }

        long duration = System.currentTimeMillis() - startTime;

        // Log summary report
        String summary = String.format(
                "Nightly Recalculation Summary: " +
                        "Organizations Processed: %d, " +
                        "Risk Scores Updated: %d, " +
                        "Escalations Processed: %d, " +
                        "Duration: %d ms",
                organizationsProcessed, risksRecalculated, escalationsProcessed, duration);

        log.info(summary);

        // Save summary to audit log
        com.rura.regtech.entity.AuditLog auditLog = com.rura.regtech.entity.AuditLog.builder()
                .action("NIGHTLY_RECALCULATION")
                .details(summary)
                .entityType("System")
                .entityId("NIGHTLY_JOB")
                .build();
        auditLogRepository.save(auditLog);

        log.info("========== COMPLETED NIGHTLY COMPLIANCE RECALCULATION ==========");
    }
}
