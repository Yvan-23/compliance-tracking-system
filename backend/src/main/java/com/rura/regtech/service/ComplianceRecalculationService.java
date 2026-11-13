package com.rura.regtech.service;

public interface ComplianceRecalculationService {

    /**
     * Nightly job to recalculate compliance statuses, risk scores, and escalation
     * levels
     * Scheduled to run at midnight
     */
    void performNightlyRecalculation();
}
