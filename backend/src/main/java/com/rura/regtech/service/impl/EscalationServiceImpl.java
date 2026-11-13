package com.rura.regtech.service.impl;

import com.rura.regtech.entity.ComplianceRecord;
import com.rura.regtech.entity.User;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.entity.enums.RoleName;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.AuditLogRepository;
import com.rura.regtech.repository.ComplianceRecordRepository;
import com.rura.regtech.repository.UserRepository;
import com.rura.regtech.service.ComplianceStateMachineService;
import com.rura.regtech.service.EscalationService;
import com.rura.regtech.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EscalationServiceImpl implements EscalationService {

    private final ComplianceRecordRepository complianceRecordRepository;
    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;
    private final ComplianceStateMachineService stateMachineService;
    private final UserRepository userRepository;
    private final com.rura.regtech.service.EnforcementService enforcementService;

    @Override
    @Scheduled(cron = "0 0 2 * * ?") // Run at 2 AM daily
    @Transactional
    public void processEscalations() {
        log.info("Starting daily escalation processing...");

        List<ComplianceRecord> allRecords = complianceRecordRepository.findAll();

        for (ComplianceRecord record : allRecords) {
            processRecordEscalation(record);
        }

        log.info("Completed daily escalation processing");
    }

    private void processRecordEscalation(ComplianceRecord record) {
        LocalDate deadline = record.getReportingPeriodEnd();
        LocalDate today = LocalDate.now();
        long daysUntilDeadline = ChronoUnit.DAYS.between(today, deadline);

        // Skip if already escalated or completed
        if (record.getStatus() == ComplianceStatus.ESCALATED ||
                record.getStatus() == ComplianceStatus.COMPLIANT ||
                record.getStatus() == ComplianceStatus.WAIVED) {
            return;
        }

        // LEVEL 1: Reminder (7 or fewer days before deadline)
        if (daysUntilDeadline <= 7 && daysUntilDeadline > 0 && record.getEscalationLevel() < 1) {
            sendEscalationNotification(record, 1, "REMINDER: Compliance deadline approaching in " + daysUntilDeadline + " days");
            record.setEscalationLevel(1);
            record.setEscalated(true);
            record.setEscalationDate(java.time.LocalDateTime.now());
            complianceRecordRepository.save(record);
        }

        // LEVEL 2: Warning (deadline missed, up to 2 days overdue)
        else if (daysUntilDeadline <= -1 && daysUntilDeadline > -3 && record.getEscalationLevel() < 2) {
            sendEscalationNotification(record, 2, "WARNING: Compliance deadline missed by " + Math.abs(daysUntilDeadline) + " day(s)");
            record.setEscalationLevel(2);
            record.setEscalated(true);
            record.setEscalationDate(java.time.LocalDateTime.now());
            complianceRecordRepository.save(record);
        }

        // LEVEL 3: Supervisor notification (3 days after deadline)
        else if (daysUntilDeadline <= -3 && record.getEscalationLevel() < 3) {
            sendSupervisorNotification(record, 3);
            record.setEscalationLevel(3);
            record.setEscalated(true);
            record.setEscalationDate(java.time.LocalDateTime.now());
            complianceRecordRepository.save(record);
        }

        // LEVEL 4: Enforcement triggered (7 days after deadline)
        else if (daysUntilDeadline <= -7 && record.getEscalationLevel() < 4) {
            triggerEnforcement(record);
            record.setEscalationLevel(4);
            record.setEscalated(true);
            record.setEscalationDate(java.time.LocalDateTime.now());
            complianceRecordRepository.save(record);

            // Transition to ESCALATED status
            try {
                stateMachineService.transitionStatus(record.getId(), ComplianceStatus.ESCALATED);
            } catch (Exception e) {
                log.error("Failed to transition to ESCALATED status for record {}", record.getId(), e);
            }
        }
    }

    private void sendEscalationNotification(ComplianceRecord record, int level, String message) {
        // Get organization users
        record.getOrganization().getUsers().forEach(user -> {
            try {
                notificationService.createNotification(
                        user.getId(),
                        "Escalation Level " + level,
                        message + " for requirement: " + record.getRequirement().getTitle(),
                        "WARNING");
            } catch (Exception e) {
                log.error("Failed to send notification to user {}", user.getId(), e);
            }
        });

        // Log in audit
        com.rura.regtech.entity.AuditLog auditLog = com.rura.regtech.entity.AuditLog.builder()
                .action("ESCALATION_LEVEL_" + level)
                .details(message)
                .entityType("ComplianceRecord")
                .entityId(record.getId().toString())
                .build();
        auditLogRepository.save(auditLog);

        log.info("Escalation Level {} triggered for compliance record {}", level, record.getId());
    }

    private void sendSupervisorNotification(ComplianceRecord record, int level) {
        sendEscalationNotification(record, level, "SUPERVISOR ALERT: Compliance overdue by 3+ days");

        // Additionally notify supervisors/admins
        java.util.List<User> supervisors = new java.util.ArrayList<>();
        supervisors.addAll(userRepository.findUsersByRoleName(RoleName.ADMIN));
        supervisors.addAll(userRepository.findUsersByRoleName(RoleName.AUDITOR));

        for (User supervisor : supervisors) {
            try {
                notificationService.createNotification(
                        supervisor.getId(),
                        "Supervisor Alert - Level " + level,
                        "Organization " + record.getOrganization().getName() + " has overdue compliance",
                        "ERROR");
            } catch (Exception e) {
                log.error("Failed to notify supervisor {}", supervisor.getId(), e);
            }
        }
    }

    private void triggerEnforcement(ComplianceRecord record) {
        String message = "ENFORCEMENT TRIGGERED: Compliance severely overdue (7+ days)";
        sendEscalationNotification(record, 4, message);

        // Log enforcement trigger
        log.warn("ENFORCEMENT TRIGGERED for compliance record {} - Organization: {}",
                record.getId(), record.getOrganization().getName());

        try {
            double penaltyAmount = 500000.0;
            String description = String.format("Auto-enforcement action issued for severely overdue requirement: %s", 
                    record.getRequirement().getTitle());
            enforcementService.createEnforcementAction(
                    record.getOrganization().getId(),
                    record.getId(),
                    "CRITICAL_OVERDUE",
                    "CRITICAL",
                    penaltyAmount,
                    description,
                    null
            );
            log.info("Successfully created automatic enforcement action for record {}", record.getId());
        } catch (Exception e) {
            log.error("Failed to automatically create enforcement action for record {}", record.getId(), e);
        }
    }

    @Override
    @Transactional
    public void escalateComplianceRecord(UUID complianceRecordId) {
        ComplianceRecord record = complianceRecordRepository.findById(complianceRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance record not found: " + complianceRecordId));

        processRecordEscalation(record);
    }
}
