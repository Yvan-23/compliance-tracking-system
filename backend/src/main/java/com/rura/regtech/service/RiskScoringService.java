package com.rura.regtech.service;

import com.rura.regtech.entity.enums.RiskLevel;

import java.util.UUID;

public interface RiskScoringService {

    /**
     * Calculate risk score for an organization (0-100)
     * 
     * @param organizationId the organization id
     * @return risk score
     */
    double calculateRiskScore(UUID organizationId);

    /**
     * Determine risk level based on score
     * 
     * @param score the risk score
     * @return risk level (LOW, MEDIUM, HIGH)
     */
    RiskLevel determineRiskLevel(double score);

    /**
     * Recalculate and save risk score for organization
     * 
     * @param organizationId the organization id
     */
    void updateOrganizationRiskScore(UUID organizationId);
}
