package com.rura.regtech.service;

import java.util.UUID;

public interface PredictiveRiskService {

    /**
     * Evaluate predictive risk for an organization
     * 
     * @param organizationId the organization id
     * @return true if likely to fail next deadline, false otherwise
     */
    boolean evaluatePredictiveRisk(UUID organizationId);

    /**
     * Get latest predictive risk assessment
     * 
     * @param organizationId the organization id
     * @return assessment result
     */
    com.rura.regtech.entity.PredictiveRiskAssessment getLatestAssessment(UUID organizationId);
}
