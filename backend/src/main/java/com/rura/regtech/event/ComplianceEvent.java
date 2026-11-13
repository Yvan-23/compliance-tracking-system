package com.rura.regtech.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Base event for all compliance-related events
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceEvent {

    private UUID eventId;

    private String eventType; // SUBMISSION_CREATED, PENALTY_ISSUED, etc.

    private UUID entityId; // ID of the entity (submission, penalty, etc.)

    private String entityType; // SUBMISSION, PENALTY, INSPECTION, etc.

    private UUID organizationId;

    private UUID userId;

    private String action; // CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.

    private Map<String, Object> payload; // Event-specific data

    private Map<String, Object> metadata; // Additional context

    private LocalDateTime timestamp;

    private String source; // Service that generated the event
}
