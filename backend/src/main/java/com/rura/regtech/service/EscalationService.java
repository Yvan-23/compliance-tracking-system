package com.rura.regtech.service;

import java.util.UUID;

public interface EscalationService {

    /**
     * Process escalations for overdue compliance records
     * Scheduled to run daily
     */
    void processEscalations();

    /**
     * Escalate a specific compliance record
     * 
     * @param complianceRecordId the compliance record id
     */
    void escalateComplianceRecord(UUID complianceRecordId);
}
