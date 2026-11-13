package com.rura.regtech.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ApprovalResponse {
    private UUID id;
    private UUID workflowInstanceId;
    private UUID stepId;
    private String stepName;
    private Integer stepOrder;
    private String role;
    private UUID approverId;
    private String approverName;
    private String status;
    private String comment;
    private LocalDateTime decidedAt;
    private LocalDateTime createdAt;
}
