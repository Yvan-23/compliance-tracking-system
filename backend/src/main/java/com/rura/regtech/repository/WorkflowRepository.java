package com.rura.regtech.repository;

import com.rura.regtech.entity.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, UUID> {
    List<Workflow> findByEntityType(String entityType);
    List<Workflow> findByEntityTypeAndEnabledTrue(String entityType);
    List<Workflow> findByOrganizationId(UUID organizationId);
    Optional<Workflow> findByEntityTypeAndOrganizationId(String entityType, UUID organizationId);
}
