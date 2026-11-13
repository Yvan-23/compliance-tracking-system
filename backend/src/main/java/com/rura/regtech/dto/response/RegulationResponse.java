package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.RegulationStatus;

import java.time.LocalDate;
import java.util.UUID;

public record RegulationResponse(
                UUID id,
                String title,
                String description,
                String sector,
                LocalDate effectiveDate,
                String version,
                RegulationStatus status) {
}
