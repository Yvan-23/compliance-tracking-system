package com.rura.regtech.scheduler;

import com.rura.regtech.service.EvidenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EvidenceExpiryScheduler {

    private final EvidenceService evidenceService;

    @Scheduled(cron = "0 0 1 * * ?")
    public void checkEvidenceExpiry() {
        log.info("Starting scheduled evidence expiry check...");

        try {
            evidenceService.processExpiryUpdates();
            log.info("Evidence expiry check completed successfully.");
        } catch (Exception e) {
            log.error("Error during evidence expiry check", e);
        }
    }
}
