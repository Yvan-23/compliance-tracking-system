package com.rura.regtech.scheduler;

import com.rura.regtech.entity.ComplianceRecord;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.repository.ComplianceRecordRepository;
import com.rura.regtech.service.ComplianceStateMachineService;
import com.rura.regtech.service.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ComplianceScheduler {

    private final ComplianceRecordRepository complianceRecordRepository;
    private final EventPublisher eventPublisher;
    private final ComplianceStateMachineService stateMachineService;

    @Scheduled(cron = "0 0 2 * * ?") // Runs daily at 2 AM
    @Transactional
    public void checkForMissedDeadlines() {
        log.info("Starting scheduled compliance deadline check...");

        List<ComplianceRecord> overdueRecords = complianceRecordRepository
                .findByStatusAndReportingPeriodEndBefore(ComplianceStatus.PENDING, LocalDate.now());

        log.info("Found {} overdue compliance records.", overdueRecords.size());

        for (ComplianceRecord record : overdueRecords) {
            try {
                processOverdueRecord(record);
            } catch (Exception e) {
                log.error("Error processing overdue record {}", record.getId(), e);
            }
        }
    }

    private void processOverdueRecord(ComplianceRecord record) {
        log.info("Deadline missed for record {}. Setting status to NON_COMPLIANT.", record.getId());

        stateMachineService.transitionStatus(record.getId(), ComplianceStatus.NON_COMPLIANT);
        record.setComplianceScore(0.0);
        complianceRecordRepository.save(record);

        // Publish event to trigger notifications
        Map<String, Object> payload = new HashMap<>();
        payload.put("deadline", record.getReportingPeriodEnd().toString());
        payload.put("reason", "Missed deadline");

        eventPublisher.publishDeadlineEvent(record.getId(), record.getOrganization().getId(), payload);
    }
}
