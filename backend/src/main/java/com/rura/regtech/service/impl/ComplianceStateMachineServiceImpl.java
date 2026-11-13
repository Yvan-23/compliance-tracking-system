package com.rura.regtech.service.impl;

import com.rura.regtech.entity.ComplianceRecord;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.exception.ComplianceStateException;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.AuditLogRepository;
import com.rura.regtech.repository.ComplianceRecordRepository;
import com.rura.regtech.service.ComplianceStateMachineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplianceStateMachineServiceImpl implements ComplianceStateMachineService {

    private final ComplianceRecordRepository complianceRecordRepository;
    private final AuditLogRepository auditLogRepository;

    // Define valid state transitions
    private static final Map<ComplianceStatus, Set<ComplianceStatus>> VALID_TRANSITIONS = new HashMap<>();

    static {
        // PENDING can transition to SUBMITTED, NON_COMPLIANT, or ESCALATED
        VALID_TRANSITIONS.put(ComplianceStatus.PENDING,
                Set.of(ComplianceStatus.SUBMITTED, ComplianceStatus.NON_COMPLIANT, ComplianceStatus.ESCALATED));

        // SUBMITTED can transition to UNDER_REVIEW, COMPLIANT, NON_COMPLIANT, PENDING
        VALID_TRANSITIONS.put(ComplianceStatus.SUBMITTED,
                Set.of(ComplianceStatus.UNDER_REVIEW, ComplianceStatus.COMPLIANT, ComplianceStatus.NON_COMPLIANT, ComplianceStatus.PENDING));

        // UNDER_REVIEW can transition to COMPLIANT, NON_COMPLIANT, WAIVED, PENDING
        VALID_TRANSITIONS.put(ComplianceStatus.UNDER_REVIEW,
                Set.of(ComplianceStatus.COMPLIANT, ComplianceStatus.NON_COMPLIANT, ComplianceStatus.WAIVED, ComplianceStatus.PENDING));

        // COMPLIANT can transition to NON_COMPLIANT, PENDING
        VALID_TRANSITIONS.put(ComplianceStatus.COMPLIANT,
                Set.of(ComplianceStatus.NON_COMPLIANT, ComplianceStatus.PENDING));

        // NON_COMPLIANT can transition to ESCALATED, SUBMITTED (resubmission), WAIVED, PENDING
        VALID_TRANSITIONS.put(ComplianceStatus.NON_COMPLIANT,
                Set.of(ComplianceStatus.ESCALATED, ComplianceStatus.SUBMITTED, ComplianceStatus.WAIVED, ComplianceStatus.PENDING));

        // WAIVED is terminal (can go back to PENDING if waiver revoked)
        VALID_TRANSITIONS.put(ComplianceStatus.WAIVED,
                Set.of(ComplianceStatus.PENDING));

        // ESCALATED can transition to SUBMITTED, NON_COMPLIANT, PENDING
        VALID_TRANSITIONS.put(ComplianceStatus.ESCALATED,
                Set.of(ComplianceStatus.SUBMITTED, ComplianceStatus.NON_COMPLIANT, ComplianceStatus.PENDING));
    }

    @Override
    public boolean isValidTransition(ComplianceStatus currentStatus, ComplianceStatus newStatus) {
        if (currentStatus == newStatus) {
            return true; // Same state is always valid
        }

        Set<ComplianceStatus> allowedTransitions = VALID_TRANSITIONS.get(currentStatus);
        return allowedTransitions != null && allowedTransitions.contains(newStatus);
    }

    @Override
    @Transactional
    public void transitionStatus(UUID complianceRecordId, ComplianceStatus newStatus) {
        ComplianceRecord record = complianceRecordRepository.findById(complianceRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance record not found: " + complianceRecordId));

        ComplianceStatus currentStatus = record.getStatus();

        // Validate transition
        if (!isValidTransition(currentStatus, newStatus)) {
            String message = String.format(
                    "Invalid state transition: Cannot transition from %s to %s for compliance record %s",
                    currentStatus, newStatus, complianceRecordId);
            log.error(message);
            throw new ComplianceStateException(message);
        }

        // Perform transition
        ComplianceStatus oldStatus = record.getStatus();
        record.setStatus(newStatus);
        complianceRecordRepository.save(record);

        // Log transition in audit log
        com.rura.regtech.entity.AuditLog auditLog = com.rura.regtech.entity.AuditLog.builder()
                .action("COMPLIANCE_STATUS_TRANSITION")
                .details(String.format("Status changed from %s to %s", oldStatus, newStatus))
                .entityType("ComplianceRecord")
                .entityId(complianceRecordId.toString())
                .build();
        auditLogRepository.save(auditLog);

        log.info("Compliance record {} transitioned from {} to {}", complianceRecordId, oldStatus, newStatus);
    }
}
