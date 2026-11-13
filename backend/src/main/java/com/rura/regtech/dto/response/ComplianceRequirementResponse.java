package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.Frequency;

import java.time.LocalDateTime;
import java.util.UUID;

public record ComplianceRequirementResponse(
                UUID id,
                UUID regulationId,
                String regulationTitle,
                String regulationSector,
                String title,
                String description,
                Frequency frequency,
                String severity,
                Integer severityLevel,
                LocalDateTime createdAt,
                LocalDateTime updatedAt) {
}
