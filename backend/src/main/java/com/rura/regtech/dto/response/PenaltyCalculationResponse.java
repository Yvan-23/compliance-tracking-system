package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.Severity;

import java.util.UUID;

public record PenaltyCalculationResponse(
                UUID violationId,
                double calculatedAmount,
                Severity severity,
                String description,
                String formula) {
}
