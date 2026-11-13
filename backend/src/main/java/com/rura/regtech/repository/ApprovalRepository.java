package com.rura.regtech.repository;

import com.rura.regtech.entity.Approval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApprovalRepository extends JpaRepository<Approval, UUID> {
    List<Approval> findByWorkflowInstanceId(UUID workflowInstanceId);
    List<Approval> findByApproverIdAndStatus(UUID approverId, Approval.ApprovalStatus status);
    List<Approval> findByWorkflowInstanceIdAndStatus(UUID workflowInstanceId, Approval.ApprovalStatus status);
    long countByWorkflowInstanceIdAndStatus(UUID workflowInstanceId, Approval.ApprovalStatus status);
    Optional<Approval> findByWorkflowInstanceIdAndStepId(UUID workflowInstanceId, UUID stepId);
    org.springframework.data.domain.Page<Approval> findByWorkflowInstanceIdAndStatus(UUID workflowInstanceId, Approval.ApprovalStatus status, org.springframework.data.domain.Pageable pageable);
    org.springframework.data.domain.Page<Approval> findByStatus(Approval.ApprovalStatus status, org.springframework.data.domain.Pageable pageable);
    List<Approval> findByStatus(Approval.ApprovalStatus status);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Approval a SET a.approver = null WHERE a.approver.id = :userId")
    void nullifyApproverByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
