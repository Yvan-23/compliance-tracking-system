package com.rura.regtech.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class WorkflowRequest {

    @NotBlank
    private String name;

    private String description;

    @NotBlank
    private String entityType;

    private Boolean enabled = true;

    @Valid
    @NotEmpty
    private List<StepRequest> steps;

    @Data
    public static class StepRequest {
        @NotNull
        private Integer stepOrder;

        @NotBlank
        private String role;

        @NotBlank
        private String stepName;

        private String description;

        private String approvalType = "SINGLE";

        private Integer escalationAfterHours;
    }
}
