package com.rura.regtech.repository;

import com.rura.regtech.entity.CorrectiveAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CorrectiveActionRepository extends JpaRepository<CorrectiveAction, UUID> {
    org.springframework.data.domain.Page<CorrectiveAction> findByFindingId(UUID findingId,
            org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<CorrectiveAction> findByFinding_Inspection_Organization_Id(UUID organizationId,
            org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<CorrectiveAction> findByOrganizationId(UUID organizationId,
            org.springframework.data.domain.Pageable pageable);

    java.util.List<CorrectiveAction> findByOrganizationId(UUID organizationId);
}
