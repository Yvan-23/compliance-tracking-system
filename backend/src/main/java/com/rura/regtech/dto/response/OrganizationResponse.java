package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.OrganizationStatus;
import com.rura.regtech.entity.enums.OrganizationType;
import com.rura.regtech.entity.enums.RiskLevel;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrganizationResponse(
                UUID id,
                String name,
                OrganizationType type,
                String sector,
                String registrationNumber,
                String address,
                Double latitude,
                Double longitude,
                String locationSource,
                OrganizationStatus status,
                Double riskScore,
                RiskLevel riskLevel,
                LocalDateTime createdAt,
                LocalDateTime updatedAt) {
}
