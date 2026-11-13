package com.rura.regtech.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class WorkflowResponse {
    private UUID id;
    private String name;
    private String description;
    private String entityType;
    private Boolean enabled;
    private String organizationName;
    private List<WorkflowStepResponse> steps;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    public static class WorkflowStepResponse {
        private UUID id;
        private Integer stepOrder;
        private String role;
        private String stepName;
        private String description;
        private String approvalType;
        private Integer escalationAfterHours;
    }
}
