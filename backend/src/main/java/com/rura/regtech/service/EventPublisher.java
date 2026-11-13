package com.rura.regtech.service;

import com.rura.regtech.event.ComplianceEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class EventPublisher {

    public void publishEvent(String topic, ComplianceEvent event) {
        log.info("Event published to {}: type={}, entityId={}, action={}",
                topic, event.getEventType(), event.getEntityId(), event.getAction());
    }

    public void publishAuditEvent(String eventType, String entityType, UUID entityId,
            UUID userId, UUID organizationId, String action,
            Map<String, Object> payload) {
        ComplianceEvent event = buildEvent(eventType, entityType, entityId,
                userId, organizationId, action, payload);
        publishEvent("audit-events", event);
    }

    public void publishNotificationEvent(String eventType, String entityType, UUID entityId,
            UUID userId, UUID organizationId, String action,
            Map<String, Object> payload) {
        ComplianceEvent event = buildEvent(eventType, entityType, entityId,
                userId, organizationId, action, payload);
        publishEvent("notification-events", event);
    }

    public void publishSubmissionEvent(String eventType, UUID submissionId,
            UUID userId, UUID organizationId,
            Map<String, Object> payload) {
        ComplianceEvent event = buildEvent(eventType, "SUBMISSION", submissionId,
                userId, organizationId, eventType, payload);
        publishEvent("submission-events", event);
    }

    public void publishEnforcementEvent(String eventType, UUID entityId,
            UUID userId, UUID organizationId,
            String entityTypeStr, Map<String, Object> payload) {
        ComplianceEvent event = buildEvent(eventType, entityTypeStr, entityId,
                userId, organizationId, eventType, payload);
        publishEvent("enforcement-events", event);
    }

    public void publishDeadlineEvent(UUID recordId, UUID organizationId,
            Map<String, Object> payload) {
        ComplianceEvent event = buildEvent("DEADLINE_MISSED", "COMPLIANCE_RECORD",
                recordId, null, organizationId, "DEADLINE_CHECK", payload);
        publishEvent("enforcement-events", event);
    }

    public void publishRiskRecalculationEvent(UUID organizationId, String reason,
            Map<String, Object> payload) {
        ComplianceEvent event = buildEvent("RISK_RECALCULATION_TRIGGERED", "ORGANIZATION",
                organizationId, null, organizationId, "RECALCULATE", payload);

        if (event.getMetadata() == null) {
            event.setMetadata(new HashMap<>());
        }
        event.getMetadata().put("reason", reason);

        publishEvent("risk-calculation", event);
    }

    private ComplianceEvent buildEvent(String eventType, String entityType, UUID entityId,
            UUID userId, UUID organizationId, String action,
            Map<String, Object> payload) {
        return ComplianceEvent.builder()
                .eventId(UUID.randomUUID())
                .eventType(eventType)
                .entityType(entityType)
                .entityId(entityId)
                .userId(userId)
                .organizationId(organizationId)
                .action(action)
                .payload(payload != null ? payload : new HashMap<>())
                .metadata(new HashMap<>())
                .timestamp(LocalDateTime.now())
                .source("compliance-tracker-backend")
                .build();
    }
}
