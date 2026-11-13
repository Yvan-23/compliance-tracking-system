package com.rura.regtech.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class WorkflowInstanceResponse {
    private UUID id;
    private String workflowName;
    private UUID workflowId;
    private UUID entityId;
    private String entityType;
    private String status;
    private String currentStepName;
    private Integer currentStepOrder;
    private String initiatedByName;
    private UUID initiatedBy;
    private UUID organizationId;
    private String entityName;
    private String evidenceFileName;
    private UUID evidenceFileId;
    private List<ApprovalResponse> approvals;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
