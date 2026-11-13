package com.rura.regtech.service;

import com.rura.regtech.entity.enums.ComplianceStatus;

import java.util.UUID;

public interface ComplianceStateMachineService {

    /**
     * Transition compliance record to a new status
     * 
     * @param complianceRecordId the compliance record id
     * @param newStatus          the new status
     * @throws com.rura.regtech.exception.ComplianceStateException if transition is
     *                                                             invalid
     */
    void transitionStatus(UUID complianceRecordId, ComplianceStatus newStatus);

    /**
     * Check if transition is valid
     * 
     * @param currentStatus current status
     * @param newStatus     new status
     * @return true if valid, false otherwise
     */
    boolean isValidTransition(ComplianceStatus currentStatus, ComplianceStatus newStatus);
}
