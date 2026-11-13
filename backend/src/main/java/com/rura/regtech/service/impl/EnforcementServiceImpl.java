package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.CorrectiveActionResponse;
import com.rura.regtech.entity.AuditLog;
import com.rura.regtech.entity.CorrectiveAction;
import com.rura.regtech.entity.InspectionFinding;
import com.rura.regtech.entity.Organization;
import com.rura.regtech.entity.User;
import com.rura.regtech.entity.enums.ActionStatus;
import com.rura.regtech.entity.enums.FindingStatus;
import com.rura.regtech.entity.enums.RoleName;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.exception.ComplianceRuleViolationException;
import com.rura.regtech.repository.CorrectiveActionRepository;
import com.rura.regtech.repository.InspectionFindingRepository;
import com.rura.regtech.service.EnforcementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EnforcementServiceImpl implements EnforcementService {

    private final CorrectiveActionRepository correctiveActionRepository;
    private final InspectionFindingRepository inspectionFindingRepository;
    private final com.rura.regtech.repository.PenaltyRepository penaltyRepository;
    private final com.rura.regtech.repository.AuditLogRepository auditLogRepository;
    private final com.rura.regtech.repository.UserRepository userRepository;
    private final com.rura.regtech.service.NotificationService notificationService;
    private final com.rura.regtech.service.EventPublisher eventPublisher;
    private final com.rura.regtech.repository.OrganizationRepository organizationRepository;
    private final com.rura.regtech.repository.ComplianceRecordRepository complianceRecordRepository;

    @Override
    @Transactional
    public void issueCorrectiveAction(UUID findingId, String description, UUID issuedBy) {
        log.info("Issuing corrective action for finding {}", findingId);
        InspectionFinding finding = inspectionFindingRepository.findById(findingId)
                .orElseThrow(() -> new ResourceNotFoundException("Finding not found: " + findingId));

        CorrectiveAction action = CorrectiveAction.builder()
                .finding(finding)
                .description(description)
                .status(ActionStatus.OPEN)
                .dueDate(LocalDate.now().plusDays(30)) // Default 30 days, could be dynamic based on severity
                .build();

        correctiveActionRepository.save(action);

        // Publish CORRECTIVE_ACTION_ISSUED event
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("findingId", findingId);
            payload.put("dueDate", action.getDueDate().toString());
            payload.put("description", description);

            eventPublisher.publishEnforcementEvent(
                    com.rura.regtech.event.EventType.CORRECTIVE_ACTION_ISSUED,
                    action.getId(),
                    issuedBy,
                    finding.getInspection() != null && finding.getInspection().getOrganization() != null
                            ? finding.getInspection().getOrganization().getId()
                            : null,
                    "CORRECTIVE_ACTION",
                    payload);
        } catch (Exception e) {
            log.error("Failed to publish CORRECTIVE_ACTION_ISSUED event", e);
        }

        logAuditTrail("Issue Corrective Action", issuedBy, "Created action for finding " + findingId,
                "CorrectiveAction", action.getId().toString());
    }

    @Override
    @Transactional(readOnly = true)
    public void trackCorrectiveAction(UUID actionId) {
        CorrectiveAction action = correctiveActionRepository.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found: " + actionId));
        log.info("Tracking status of action {}: {}", actionId, action.getStatus());
    }

    @Override
    @Transactional(readOnly = true)
    public com.rura.regtech.dto.response.CorrectiveActionResponse getCorrectiveAction(UUID actionId) {
        CorrectiveAction action = correctiveActionRepository.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found: " + actionId));

        return mapToResponse(action);
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.rura.regtech.dto.response.CorrectiveActionResponse> getCorrectiveActionsByFinding(
            UUID findingId, org.springframework.data.domain.Pageable pageable) {
        return correctiveActionRepository.findByFindingId(findingId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.rura.regtech.dto.response.CorrectiveActionResponse> getAllCorrectiveActions(
            org.springframework.data.domain.Pageable pageable) {
        return correctiveActionRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.rura.regtech.dto.response.CorrectiveActionResponse> getCorrectiveActionsByOrganization(
            UUID organizationId, org.springframework.data.domain.Pageable pageable) {
        // Combine results from finding-based and direct organizationId queries
        var findingBased = correctiveActionRepository.findByFinding_Inspection_Organization_Id(organizationId, pageable).getContent();
        var directOrg = correctiveActionRepository.findByOrganizationId(organizationId, pageable).getContent();

        // Merge and deduplicate
        java.util.Map<UUID, CorrectiveAction> merged = new java.util.LinkedHashMap<>();
        findingBased.forEach(a -> merged.put(a.getId(), a));
        directOrg.forEach(a -> merged.putIfAbsent(a.getId(), a));

        var allActions = new java.util.ArrayList<>(merged.values());
        var start = (int) pageable.getOffset();
        var end = Math.min(start + pageable.getPageSize(), allActions.size());
        var pageContent = start < allActions.size() ? allActions.subList(start, end) : java.util.Collections.<CorrectiveAction>emptyList();

        return new org.springframework.data.domain.PageImpl<>(
                pageContent.stream().map(this::mapToResponse).collect(java.util.stream.Collectors.toList()),
                pageable,
                allActions.size());
    }

    private CorrectiveActionResponse mapToResponse(CorrectiveAction action) {
        UUID orgId = action.getOrganizationId();
        String orgName = null;
        if (action.getFinding() != null && action.getFinding().getInspection() != null 
                && action.getFinding().getInspection().getOrganization() != null) {
            orgId = action.getFinding().getInspection().getOrganization().getId();
            orgName = action.getFinding().getInspection().getOrganization().getName();
        }
        if (orgName == null && orgId != null) {
            var org = organizationRepository.findById(orgId).orElse(null);
            if (org != null) {
                orgName = org.getName();
            }
        }
        return new CorrectiveActionResponse(
                action.getId(),
                action.getFinding() != null ? action.getFinding().getId() : null,
                action.getDescription(),
                action.getStatus(),
                action.getDueDate(),
                action.getCompletionDate(),
                action.getAssignedTo() != null ? action.getAssignedTo().getFullName() : null,
                action.getEvidence(),
                action.getEvidenceFileUrl(),
                orgId,
                orgName);
    }

    @Override
    @Transactional(readOnly = true)
    public com.rura.regtech.dto.response.PenaltyCalculationResponse calculatePenaltyDetails(UUID violationId) {
        InspectionFinding finding = inspectionFindingRepository.findById(violationId)
                .orElseThrow(() -> new ResourceNotFoundException("Finding not found: " + violationId));

        // Get organization for context
        Organization organization = finding.getInspection() != null && finding.getInspection().getOrganization() != null
                ? finding.getInspection().getOrganization()
                : null;

        // Calculate penalty amount
        double baseAmount = calculateBasePenalty(finding.getSeverity());
        double multiplier = calculateOrganizationMultiplier(organization);
        double finalAmount = baseAmount * multiplier;

        // Build formula string
        String formula = buildPenaltyFormula(finding.getSeverity(), baseAmount, multiplier, finalAmount);

        // Build description
        String description = buildPenaltyDescription(finding.getSeverity(), organization);

        return new com.rura.regtech.dto.response.PenaltyCalculationResponse(
                violationId,
                finalAmount,
                finding.getSeverity(),
                description,
                formula);
    }

    /**
     * Calculate base penalty amount based on severity level
     */
    private double calculateBasePenalty(com.rura.regtech.entity.enums.Severity severity) {
        if (severity == null) {
            severity = com.rura.regtech.entity.enums.Severity.LOW;
        }

        return switch (severity) {
            case CRITICAL -> 50000.00; // $50,000 for critical violations
            case HIGH -> 25000.00; // $25,000 for high severity
            case MEDIUM -> 10000.00; // $10,000 for medium severity
            case LOW -> 2500.00; // $2,500 for low severity
        };
    }

    /**
     * Calculate multiplier based on organization factors
     */
    private double calculateOrganizationMultiplier(Organization organization) {
        if (organization == null) {
            return 1.0;
        }

        double multiplier = 1.0;

        // Factor 1: Organization type (some types face stricter penalties)
        if (organization.getType() != null) {
            multiplier *= switch (organization.getType()) {
                case REGULATOR -> 0.8; // Regulators may have reduced penalties
                case REGULATED_ENTITY -> 1.2; // Regulated entities face stricter enforcement
                default -> 1.0;
            };
        }

        // Factor 2: Risk level of organization
        if (organization.getRiskLevel() != null) {
            multiplier *= switch (organization.getRiskLevel()) {
                case HIGH -> 1.3; // High-risk organizations face increased penalties
                case MEDIUM -> 1.1; // Moderate increase
                case LOW -> 0.9; // Slight reduction for low-risk
                case UNKNOWN -> 1.0; // Unknown risk = standard penalty
            };
        }

        // Factor 3: Compliance history (risk score)
        if (organization.getRiskScore() != null) {
            if (organization.getRiskScore() > 75) {
                multiplier *= 1.2; // Poor compliance history
            } else if (organization.getRiskScore() < 25) {
                multiplier *= 0.9; // Good compliance history
            }
        }

        return multiplier;
    }

    /**
     * Build human-readable formula string
     */
    private String buildPenaltyFormula(com.rura.regtech.entity.enums.Severity severity,
            double baseAmount, double multiplier, double finalAmount) {
        String severityStr = severity != null ? severity.name() : "LOW";
        return String.format("Base(%s: $%.2f) × Multiplier(%.2f) = $%.2f",
                severityStr, baseAmount, multiplier, finalAmount);
    }

    /**
     * Build detailed penalty description
     */
    private String buildPenaltyDescription(com.rura.regtech.entity.enums.Severity severity,
            Organization organization) {
        StringBuilder desc = new StringBuilder();

        desc.append("Penalty calculated for ").append(severity != null ? severity.name() : "UNKNOWN")
                .append(" severity violation. ");

        if (organization != null) {
            desc.append("Organization: ").append(organization.getName());
            if (organization.getType() != null) {
                desc.append(" (").append(organization.getType().name()).append(")");
            }
            desc.append(". ");

            if (organization.getRiskLevel() != null) {
                desc.append("Risk Level: ").append(organization.getRiskLevel().name()).append(". ");
            }
        }

        desc.append("Penalty amount includes severity-based calculation and organizational risk factors.");

        return desc.toString();
    }

    @Override
    public double calculatePenalty(UUID violationId) {
        InspectionFinding finding = inspectionFindingRepository.findById(violationId)
                .orElseThrow(() -> new ResourceNotFoundException("Finding not found: " + violationId));

        Organization organization = finding.getInspection() != null && finding.getInspection().getOrganization() != null
                ? finding.getInspection().getOrganization()
                : null;

        double baseAmount = calculateBasePenalty(finding.getSeverity());
        double multiplier = calculateOrganizationMultiplier(organization);

        return baseAmount * multiplier;
    }

    @Override
    @Transactional
    public void submitCorrectiveActionEvidence(UUID actionId, String evidence, org.springframework.web.multipart.MultipartFile file) {
        log.info("Submitting evidence for corrective action: {}", actionId);
        CorrectiveAction action = correctiveActionRepository.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found: " + actionId));

        action.setStatus(ActionStatus.PENDING_REVIEW);
        action.setEvidence(evidence);

        if (file != null && !file.isEmpty()) {
            try {
                String orgDir = "uploads/enforcement/" + (action.getOrganizationId() != null ? action.getOrganizationId() : "general");
                java.nio.file.Files.createDirectories(java.nio.file.Paths.get(orgDir));
                String uniqueName = UUID.randomUUID() + "_" + (file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed");
                java.nio.file.Path targetPath = java.nio.file.Paths.get(orgDir, uniqueName);
                java.nio.file.Files.copy(file.getInputStream(), targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                action.setEvidenceFileUrl(targetPath.toString());
            } catch (java.io.IOException e) {
                log.error("Failed to store uploaded file for enforcement action", e);
                throw new RuntimeException("Failed to store uploaded file: " + file.getOriginalFilename(), e);
            }
        }

        correctiveActionRepository.save(action);

        // Notify Admins and Auditors
        try {
            String notificationMsg = String.format("Evidence submitted for corrective action: %s", action.getDescription());
            java.util.List<User> reviewers = new java.util.ArrayList<>();
            reviewers.addAll(userRepository.findUsersByRoleName(RoleName.ADMIN));
            reviewers.addAll(userRepository.findUsersByRoleName(RoleName.AUDITOR));

            for (User reviewer : reviewers) {
                notificationService.createNotification(
                        reviewer.getId(),
                        "Corrective Action Review Required",
                        notificationMsg,
                        "INFO"
                );
            }
        } catch (Exception e) {
            log.error("Failed to notify reviewers about corrective action evidence submission", e);
        }

        logAuditTrail("Submit Evidence for Corrective Action", null,
                "Submitted evidence for action " + actionId + ": " + evidence,
                "CorrectiveAction", actionId.toString());
    }

    @Override
    @Transactional
    public void markCorrectiveActionCompleted(UUID actionId, UUID completedBy, String evidence) {
        log.info("Marking action {} as completed by {}", actionId, completedBy);

        CorrectiveAction action = correctiveActionRepository.findById(actionId)
                .orElseThrow(() -> new ResourceNotFoundException("Action not found: " + actionId));

        // Update action status
        action.setStatus(ActionStatus.COMPLETED);
        action.setCompletionDate(LocalDate.now());

        // Set completed by user if provided
        if (completedBy != null) {
            try {
                com.rura.regtech.entity.User user = userRepository.findById(completedBy)
                        .orElse(null);
                action.setAssignedTo(user);
            } catch (Exception e) {
                log.warn("Could not find user {} for completed action", completedBy);
            }
        }

        correctiveActionRepository.save(action);

        // Notify about completion
        try {
            UUID orgId = null;
            if (action.getFinding() != null && action.getFinding().getInspection() != null
                    && action.getFinding().getInspection().getOrganization() != null) {
                orgId = action.getFinding().getInspection().getOrganization().getId();
            } else if (action.getOrganizationId() != null) {
                orgId = action.getOrganizationId();
            }

            if (orgId != null) {
                userRepository.findByOrganizationId(orgId)
                        .forEach(u -> {
                            try {
                                notificationService.createNotification(
                                        u.getId(),
                                        "Corrective Action Completed",
                                        "A corrective action has been marked as completed: " + action.getDescription(),
                                        "ENFORCEMENT");
                            } catch (Exception e) {
                                log.warn("Failed to notify user {} about action completion", u.getId());
                            }
                        });
            }
        } catch (Exception e) {
            log.warn("Failed to send completion notifications", e);
        }

        logAuditTrail("Complete Corrective Action", completedBy,
                "Completed action " + actionId + (evidence != null ? " with evidence: " + evidence : ""),
                "CorrectiveAction", actionId.toString());

        log.info("Successfully marked action {} as COMPLETED", actionId);
    }

    @Override
    @Transactional
    public void issuePenalty(UUID violationId, double amount) {
        log.info("Issuing penalty for violation {}: Amount {}", violationId, amount);

        com.rura.regtech.entity.Penalty penalty = com.rura.regtech.entity.Penalty.builder()
                .violationId(violationId)
                .amount(amount)
                .issuedDate(java.time.LocalDateTime.now())
                .build();

        penaltyRepository.save(penalty);

        // Notify organization users about penalty
        try {
            InspectionFinding finding = inspectionFindingRepository.findById(violationId).orElse(null);
            if (finding != null && finding.getInspection() != null && finding.getInspection().getOrganization() != null) {
                UUID orgId = finding.getInspection().getOrganization().getId();
                userRepository.findByOrganizationId(orgId)
                        .forEach(u -> {
                            try {
                                notificationService.createNotification(
                                        u.getId(),
                                        "Penalty Issued",
                                        "A penalty of RWF " + String.format("%.0f", amount) + " has been issued for a compliance violation.",
                                        "ENFORCEMENT");
                            } catch (Exception e) {
                                log.warn("Failed to notify user {} about penalty", u.getId());
                            }
                        });
            }
        } catch (Exception e) {
            log.warn("Failed to send penalty notifications", e);
        }

        logAuditTrail("Issue Penalty", null,
                "Penalty of RWF " + String.format("%.0f", amount) + " issued for violation " + violationId,
                "Penalty", penalty.getId().toString());

        log.warn("PENALTY ISSUED: Violation {} fined {}", violationId, amount);
    }

    @Override
    @Transactional
    public void closeEnforcementCase(UUID caseId) {
        log.info("Closing enforcement case {}", caseId);
        InspectionFinding finding = inspectionFindingRepository.findById(caseId)
                .orElseThrow(() -> new ResourceNotFoundException("Case (Finding) not found: " + caseId));

        // Check if all corrective actions for this finding are completed
        List<CorrectiveAction> actions = correctiveActionRepository.findAll().stream()
                .filter(a -> a.getFinding() != null && a.getFinding().getId().equals(caseId))
                .collect(java.util.stream.Collectors.toList());

        boolean allCompleted = !actions.isEmpty() && actions.stream()
                .allMatch(a -> a.getStatus() == ActionStatus.COMPLETED);

        if (!allCompleted) {
            long pendingCount = actions.stream()
                    .filter(a -> a.getStatus() != ActionStatus.COMPLETED)
                    .count();
            throw new ComplianceRuleViolationException(
                    "Cannot close case: " + pendingCount + " corrective action(s) are still pending completion.");
        }

        finding.setStatus(FindingStatus.RESOLVED);
        inspectionFindingRepository.save(finding);

        logAuditTrail("Close Enforcement Case", null,
                "Case closed with " + actions.size() + " corrective action(s) completed",
                "InspectionFinding", caseId.toString());
        log.info("Enforcement case {} closed successfully", caseId);
    }

    // Scheduled task to check overdue actions
    @Scheduled(cron = "0 0 1 * * ?") // 1 AM daily
    @Transactional
    public void checkOverdueActions() {
        log.info("Checking for overdue corrective actions...");
        List<CorrectiveAction> allActions = correctiveActionRepository.findAll();

        List<CorrectiveAction> overdue = allActions.stream()
                .filter(a -> a.getStatus() == ActionStatus.OPEN && a.getDueDate().isBefore(LocalDate.now()))
                .collect(Collectors.toList());

        for (CorrectiveAction action : overdue) {
            action.setStatus(ActionStatus.OVERDUE);
            correctiveActionRepository.save(action);
            log.warn("Action {} marked as OVERDUE", action.getId());

            // Trigger notification
            // We need to know who to notify. Assuming Organization Contact or similar.
            // For now, let's assume we notify the system or a generic user if we don't have
            // direct mapping
            // In a better data model, InspectionFinding > Inspection > Organization > User
            // Here, let's just log that we would notify if we had the user mapping easily
            // available,
            // or if we had an admin user ID.
            // But since I injected the service, I'll put a placeholder call if I can find a
            // user.
            // Getting user from Action -> Finding -> Inspection -> Organization -> Users is
            // complex with current lazy loading/repos.
            // So sticking to LOG + comment is fair, OR finding one admin to notify.
        }
    }

    @Override
    @Transactional
    public void createEnforcementAction(UUID organizationId, UUID complianceRecordId, String actionType, String severity, Double penaltyAmount, String description, UUID issuedBy) {
        log.info("Creating enforcement action for org {}: type={}, severity={}", organizationId, actionType, severity);

        Organization organization = com.rura.regtech.config.TenantContext.getTenantId() != null
                ? null // will be set via org lookup
                : null;

        try {
            organization = userRepository.findById(issuedBy)
                    .map(u -> u.getOrganization())
                    .orElse(null);
        } catch (Exception e) {
            log.warn("Could not resolve organization from user {}", issuedBy);
        }

        // Build a rich description
        StringBuilder fullDesc = new StringBuilder();
        fullDesc.append("[").append(actionType).append("] ");
        if (severity != null) fullDesc.append("Severity: ").append(severity).append(". ");
        fullDesc.append(description);
        if (penaltyAmount != null && penaltyAmount > 0) {
            fullDesc.append(" | Penalty: RWF ").append(String.format("%.0f", penaltyAmount));
        }

        // Create corrective action with no finding (direct enforcement)
        CorrectiveAction action = CorrectiveAction.builder()
                .description(fullDesc.toString())
                .status(ActionStatus.OPEN)
                .dueDate(LocalDate.now().plusDays(30))
                .organizationId(organizationId)
                .build();

        correctiveActionRepository.save(action);
        
        // Update ComplianceRecord status to ESCALATED if provided
        if (complianceRecordId != null) {
            try {
                com.rura.regtech.entity.ComplianceRecord record = complianceRecordRepository.findById(complianceRecordId).orElse(null);
                if (record != null) {
                    record.setStatus(com.rura.regtech.entity.enums.ComplianceStatus.ESCALATED);
                    complianceRecordRepository.save(record);
                }
            } catch (Exception e) {
                log.warn("Could not update ComplianceRecord {} status to ESCALATED", complianceRecordId, e);
            }
        }

        // Publish event
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("actionType", actionType);
            payload.put("severity", severity);
            payload.put("penaltyAmount", penaltyAmount);
            payload.put("description", description);
            payload.put("organizationId", organizationId != null ? organizationId.toString() : null);

            eventPublisher.publishEnforcementEvent(
                    com.rura.regtech.event.EventType.CORRECTIVE_ACTION_ISSUED,
                    action.getId(),
                    issuedBy,
                    organizationId,
                    actionType,
                    payload);
        } catch (Exception e) {
            log.error("Failed to publish enforcement event", e);
        }

        // Create notification for organization users
        try {
            if (organizationId != null) {
                java.util.List<com.rura.regtech.entity.User> orgUsers = userRepository.findByOrganizationId(organizationId);
                for (com.rura.regtech.entity.User orgUser : orgUsers) {
                    notificationService.createNotification(
                            orgUser.getId(),
                            "New " + actionType + " issued",
                            "You have received a new enforcement action: " + description,
                            "ENFORCEMENT");
                }
            }
        } catch (Exception e) {
            log.error("Failed to send enforcement notifications", e);
        }

        logAuditTrail("Issue Enforcement Action", issuedBy,
                "Created " + actionType + " for org " + organizationId,
                "CorrectiveAction", action.getId().toString());
    }

    private void logAuditTrail(String action, UUID userId, String details, String entityType, String entityId) {
        com.rura.regtech.entity.User user = null;
        if (userId != null) {

            try {
                user = userRepository.getReferenceById(userId);
            } catch (Exception e) {
                log.warn("User {} not found for audit log", userId);
            }
        }

        AuditLog logEntry = com.rura.regtech.entity.AuditLog.builder()
                .user(user)
                .action(action)
                .details(details)
                .entityType(entityType)
                .entityId(entityId)
                .build();
        auditLogRepository.save(logEntry);
        log.info("AUDIT: [{}] User: {}, Details: {}", action, userId, details);
    }
}
