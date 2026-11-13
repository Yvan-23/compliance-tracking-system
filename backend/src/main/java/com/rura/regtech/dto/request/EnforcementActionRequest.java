package com.rura.regtech.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnforcementActionRequest {
    @NotNull(message = "Organization ID is required")
    private UUID organizationId;

    @NotBlank(message = "Action type is required")
    private String actionType;

    private String severity;

    private Double penaltyAmount;

    @NotBlank(message = "Description is required")
    private String description;

    private UUID complianceRecordId;
}
