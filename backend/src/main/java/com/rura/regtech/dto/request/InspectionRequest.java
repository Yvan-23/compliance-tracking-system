package com.rura.regtech.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionRequest {

    @NotNull(message = "Organization ID is required")
    private UUID organizationId;

    private UUID inspectorId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate scheduledDate;
}
