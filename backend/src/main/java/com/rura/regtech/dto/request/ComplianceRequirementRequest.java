package com.rura.regtech.dto.request;

import com.rura.regtech.entity.enums.Frequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class ComplianceRequirementRequest {
    @NotNull(message = "Regulation ID is required")
    private UUID regulationId;
    @NotBlank(message = "Title is required")
    private String title;
    @NotBlank(message = "Description is required")
    private String description;
    @NotNull(message = "Frequency is required")
    private String frequency;

    private int severityLevel;
}
