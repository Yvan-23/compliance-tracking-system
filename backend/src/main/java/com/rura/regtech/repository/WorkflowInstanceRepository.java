package com.rura.regtech.repository;

import com.rura.regtech.entity.WorkflowInstance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, UUID> {
    Page<WorkflowInstance> findByStatus(WorkflowInstance.WorkflowStatus status, Pageable pageable);
    Page<WorkflowInstance> findByEntityId(UUID entityId, Pageable pageable);
    Page<WorkflowInstance> findByEntityType(String entityType, Pageable pageable);
    List<WorkflowInstance> findByStatus(WorkflowInstance.WorkflowStatus status);
    Optional<WorkflowInstance> findByEntityIdAndStatusIn(UUID entityId, List<WorkflowInstance.WorkflowStatus> statuses);
    long countByStatus(WorkflowInstance.WorkflowStatus status);
    Page<WorkflowInstance> findByOrganizationId(UUID organizationId, Pageable pageable);
    Page<WorkflowInstance> findByOrganizationIdAndStatus(UUID organizationId, WorkflowInstance.WorkflowStatus status, Pageable pageable);
}
