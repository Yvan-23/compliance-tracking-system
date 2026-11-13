package com.rura.regtech.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class RegulationRequest {
    @NotBlank(message = "Title is required")
    private String title;
    @NotBlank(message = "Description is required")
    private String description;
    @NotBlank(message = "Sector is required")
    private String sector;
    @NotNull(message = "Effective date is required")
    private LocalDate effectiveDate;
    private String version;
}
