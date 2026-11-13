package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.ComplianceStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ComplianceRecordResponse(
        UUID id,
        UUID organizationId,
        String organizationName,
        UUID requirementId,
        String requirementTitle,
        ComplianceStatus status,
        Double complianceScore,
        LocalDate reportingPeriodStart,
        LocalDate reportingPeriodEnd,
        Boolean escalated,
        LocalDateTime escalationDate) {
}
