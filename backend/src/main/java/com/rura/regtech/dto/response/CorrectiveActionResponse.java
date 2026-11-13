package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.ActionStatus;

import java.time.LocalDate;
import java.util.UUID;

public record CorrectiveActionResponse(
        UUID id,
        UUID findingId,
        String description,
        ActionStatus status,
        LocalDate dueDate,
        LocalDate completionDate,
        String assignedTo,
        String evidence,
        String evidenceFileUrl,
        UUID organizationId,
        String organizationName) {
}

