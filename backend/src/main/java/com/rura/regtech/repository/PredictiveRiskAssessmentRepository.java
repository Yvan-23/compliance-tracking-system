package com.rura.regtech.repository;

import com.rura.regtech.entity.PredictiveRiskAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PredictiveRiskAssessmentRepository extends JpaRepository<PredictiveRiskAssessment, UUID> {
    Optional<PredictiveRiskAssessment> findTopByOrganizationIdOrderByAssessedAtDesc(UUID organizationId);
}
