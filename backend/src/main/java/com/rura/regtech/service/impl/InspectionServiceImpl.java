package com.rura.regtech.service.impl;

import com.rura.regtech.dto.request.InspectionRequest;
import com.rura.regtech.dto.request.InspectionFindingRequest;
import com.rura.regtech.dto.response.InspectionResponse;
import com.rura.regtech.dto.response.InspectionFindingResponse;
import com.rura.regtech.entity.Inspection;
import com.rura.regtech.entity.enums.FindingStatus;
import com.rura.regtech.entity.InspectionFinding;
import com.rura.regtech.entity.Organization;
import com.rura.regtech.entity.User;
import com.rura.regtech.entity.enums.InspectionStatus;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.InspectionFindingRepository;
import com.rura.regtech.repository.InspectionRepository;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.repository.UserRepository;
import com.rura.regtech.service.InspectionService;
import com.rura.regtech.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InspectionServiceImpl implements InspectionService {

    private final InspectionRepository inspectionRepository;
    private final InspectionFindingRepository findingRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final com.rura.regtech.service.EnforcementService enforcementService;
    private final com.rura.regtech.repository.ComplianceRequirementRepository complianceRequirementRepository;

    @Value("${ai.groq.api-key:}")
    private String apiKey;

    @Value("${ai.groq.base-url:https://api.groq.com/openai/v1}")
    private String baseUrl;

    @Value("${ai.groq.model:llama-3.1-8b-instant}")
    private String model;

    @Override
    @Transactional
    public InspectionFindingResponse addFinding(UUID inspectionId, InspectionFindingRequest request) {
        log.info("Adding finding to inspection: {}", inspectionId);
        Inspection inspection = inspectionRepository.findById(inspectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found: " + inspectionId));

        UUID currentUserId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
        User currentUser = null;
        if (currentUserId != null) {
            currentUser = userRepository.findById(currentUserId).orElse(null);
        }
        if (currentUser == null && inspection.getInspector() != null) {
            currentUser = inspection.getInspector();
        }

        com.rura.regtech.entity.ComplianceRequirement requirement = null;
        if (request.getRequirementId() != null) {
            requirement = complianceRequirementRepository.findById(request.getRequirementId())
                    .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + request.getRequirementId()));
        }

        InspectionFinding finding = InspectionFinding.builder()
                .inspection(inspection)
                .requirement(requirement)
                .description(request.getDescription())
                .severity(request.getSeverity())
                .status(FindingStatus.OPEN)
                .createdBy(currentUser)
                .build();

        InspectionFinding saved = findingRepository.save(finding);
        log.info("Finding added successfully: {}", saved.getId());

        // Automatically issue a Corrective Action for the finding
        try {
            String actionDesc = "Corrective action required for finding: " + saved.getDescription();
            if (requirement != null) {
                actionDesc += " (Violates requirement: " + requirement.getTitle() + ")";
            }
            enforcementService.issueCorrectiveAction(
                saved.getId(), 
                actionDesc, 
                saved.getCreatedBy() != null ? saved.getCreatedBy().getId() : null
            );
            log.info("Automatically issued corrective action for finding {}", saved.getId());
        } catch (Exception e) {
            log.error("Failed to automatically issue corrective action for finding {}", saved.getId(), e);
        }

        String recorderName = saved.getCreatedBy() != null ? saved.getCreatedBy().getFullName() :
                (inspection.getInspector() != null ? inspection.getInspector().getFullName() : "Assigned Inspector");

        return InspectionFindingResponse.builder()
                .id(saved.getId())
                .inspectionId(inspectionId)
                .description(saved.getDescription())
                .severity(saved.getSeverity())
                .status(saved.getStatus())
                .createdById(saved.getCreatedBy() != null ? saved.getCreatedBy().getId() : null)
                .createdByName(recorderName)
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .requirementId(requirement != null ? requirement.getId() : null)
                .requirementTitle(requirement != null ? requirement.getTitle() : null)
                .build();
    }

    @Override
    @Transactional
    public InspectionResponse createInspection(InspectionRequest request) {
        log.info("Creating inspection for organization: {}", request.getOrganizationId());

        Organization organization = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        User inspector = null;
        if (request.getInspectorId() != null) {
            inspector = userRepository.findById(request.getInspectorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Inspector not found: " + request.getInspectorId()));
        } else {
            UUID currentUserId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
            if (currentUserId != null) {
                inspector = userRepository.findById(currentUserId).orElse(null);
            }
        }

        LocalDateTime scheduledDateTime = null;
        if (request.getScheduledDate() != null) {
            scheduledDateTime = request.getScheduledDate().atStartOfDay();
        } else {
            scheduledDateTime = LocalDateTime.now().plusDays(7);
        }
        
        Inspection inspection = Inspection.builder()
                .organization(organization)
                .inspector(inspector)
                .scheduledDate(scheduledDateTime)
                .status(InspectionStatus.SCHEDULED)
                .build();

        Inspection saved = inspectionRepository.save(inspection);
        log.info("Inspection created: {}", saved.getId());
        
        if (inspector != null) {
            try {
                notificationService.createNotification(
                        inspector.getId(),
                        "Inspection Scheduled",
                        "You have been assigned to inspect " + organization.getName() + " on " + scheduledDateTime.toLocalDate(),
                        "INFO");
            } catch (Exception e) {
                log.error("Failed to send notification to inspector", e);
            }
        }

        // Notify organization users about the scheduled inspection
        if (organization.getUsers() != null) {
            for (User orgUser : organization.getUsers()) {
                if (inspector == null || !orgUser.getId().equals(inspector.getId())) {
                    try {
                        notificationService.createNotification(
                                orgUser.getId(),
                                "Inspection Scheduled",
                                "An inspection has been scheduled for " + organization.getName()
                                        + " on " + scheduledDateTime.toLocalDate()
                                        + (inspector != null ? " (Inspector: " + inspector.getFullName() + ")" : ""),
                                "INFO");
                    } catch (Exception e) {
                        log.error("Failed to notify organization user {}", orgUser.getId(), e);
                    }
                }
            }
        }
        
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public InspectionResponse getInspectionById(UUID id) {
        Inspection inspection = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found: " + id));
        return mapToResponse(inspection);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InspectionResponse> getAllInspections(Pageable pageable) {
        return inspectionRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InspectionResponse> getInspectionsByOrganization(UUID organizationId, Pageable pageable) {
        return inspectionRepository.findByOrganizationId(organizationId, pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InspectionResponse> getInspectionsByInspector(UUID inspectorId, Pageable pageable) {
        return inspectionRepository.findByInspectorId(inspectorId, pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional
    public InspectionResponse updateInspection(UUID id, InspectionRequest request) {
        Inspection inspection = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found: " + id));

        if (request.getOrganizationId() != null) {
            Organization organization = organizationRepository.findById(request.getOrganizationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));
            inspection.setOrganization(organization);
        }

        if (request.getInspectorId() != null) {
            User inspector = userRepository.findById(request.getInspectorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Inspector not found: " + request.getInspectorId()));
            inspection.setInspector(inspector);
        }

        if (request.getScheduledDate() != null) {
            inspection.setScheduledDate(request.getScheduledDate().atStartOfDay());
        }

        Inspection saved = inspectionRepository.save(inspection);
        log.info("Inspection {} updated", id);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteInspection(UUID id) {
        Inspection inspection = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found: " + id));
        inspectionRepository.delete(inspection);
        log.info("Inspection {} deleted", id);
    }

    @Override
    @Transactional
    public InspectionResponse updateInspectionStatus(UUID id, String status) {
        Inspection inspection = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found: " + id));

        InspectionStatus newStatus;
        try {
            newStatus = InspectionStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status: " + status);
        }

        InspectionStatus currentStatus = inspection.getStatus();
        if (currentStatus == newStatus) {
            return mapToResponse(inspection);
        }

        if (currentStatus == InspectionStatus.CLOSED) {
            throw new IllegalStateException("Inspection is CLOSED and cannot be modified.");
        }
        if (currentStatus == InspectionStatus.COMPLETED && (newStatus == InspectionStatus.IN_PROGRESS || newStatus == InspectionStatus.SCHEDULED)) {
            throw new IllegalStateException("Cannot regress inspection from COMPLETED to " + newStatus);
        }
        if (currentStatus == InspectionStatus.IN_PROGRESS && newStatus == InspectionStatus.SCHEDULED) {
            throw new IllegalStateException("Cannot regress inspection from IN_PROGRESS to SCHEDULED");
        }

        inspection.setStatus(newStatus);
        Inspection updated = inspectionRepository.save(inspection);
        log.info("Inspection {} status updated to {}", id, newStatus);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public InspectionResponse assignInspector(UUID inspectionId, UUID inspectorId) {
        Inspection inspection = inspectionRepository.findById(inspectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found: " + inspectionId));

        User inspector = userRepository.findById(inspectorId)
                .orElseThrow(() -> new ResourceNotFoundException("Inspector not found: " + inspectorId));

        inspection.setInspector(inspector);
        Inspection updated = inspectionRepository.save(inspection);
        log.info("Inspector {} assigned to inspection {}", inspectorId, inspectionId);
        return mapToResponse(updated);
    }

    @Override
    public String generateAIAnalysis(UUID inspectionId) {
        Inspection inspection = inspectionRepository.findById(inspectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found: " + inspectionId));

        var findings = findingRepository.findByInspectionId(inspectionId);
        String findingsSummary = findings.stream()
                .map(f -> "- " + f.getDescription() + " (Severity: " + f.getSeverity() + ")")
                .collect(Collectors.joining("\n"));

        if (findingsSummary.isEmpty()) {
            findingsSummary = "No findings recorded yet.";
        }

        String prompt = String.format("""
            You are a compliance expert analyzing an inspection report for organization: %s
            Inspection ID: %s
            Status: %s
            Scheduled Date: %s
            
            Findings:
            %s
            
            Based on this inspection data, provide:
            1. A brief summary of the inspection results
            2. Key risk areas identified
            3. Recommended actions
            4. Overall compliance assessment (COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT)
            
            Keep your response professional and concise.
            """,
            inspection.getOrganization().getName(),
            inspectionId,
            inspection.getStatus(),
            inspection.getScheduledDate() != null ? inspection.getScheduledDate().toLocalDate() : "N/A",
            findingsSummary
        );

        try {
            String response = callGroqAPI(prompt);
            log.info("AI analysis generated for inspection {}", inspectionId);
            return response;
        } catch (Exception e) {
            log.error("Failed to generate AI analysis", e);
            return "AI analysis unavailable at this time.";
        }
    }

    @Override
    public String generateInspectionReport(UUID inspectionId) {
        Inspection inspection = inspectionRepository.findById(inspectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found: " + inspectionId));

        var findings = findingRepository.findByInspectionId(inspectionId);
        String findingsSummary = findings.stream()
                .map(f -> String.format("- %s [Severity: %s]", f.getDescription(), f.getSeverity()))
                .collect(Collectors.joining("\n"));

        if (findingsSummary.isEmpty()) {
            findingsSummary = "No findings recorded.";
        }

        String prompt = String.format("""
            Generate a formal inspection report for regulatory compliance.
            
            ORGANIZATION: %s
            INSPECTION ID: %s
            INSPECTOR: %s
            DATE: %s
            STATUS: %s
            
            FINDINGS:
            %s
            
            Generate a comprehensive inspection report with:
            1. Executive Summary
            2. Organization Details
            3. Detailed Findings
            4. Risk Assessment
            5. Recommendations
            6. Compliance Conclusion
            
            Use professional regulatory language.
            """,
            inspection.getOrganization().getName(),
            inspectionId,
            inspection.getInspector() != null ? inspection.getInspector().getFullName() : "Not Assigned",
            inspection.getScheduledDate(),
            inspection.getStatus(),
            findingsSummary
        );

        try {
            String response = callGroqAPI(prompt);
            log.info("AI inspection report generated for inspection {}", inspectionId);
            return response;
        } catch (Exception e) {
            log.error("Failed to generate inspection report", e);
            return "Report generation unavailable at this time.";
        }
    }

    private String callGroqAPI(String prompt) {
        // Try Groq API; fall back to local analysis if unavailable
        if (apiKey == null || apiKey.isEmpty() || "your-api-key-here".equals(apiKey)) {
            log.warn("Groq API key not configured, generating local analysis");
            return generateLocalAnalysis(prompt);
        }
        try {
            RestTemplate restTemplate = new RestTemplate();
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(
                Map.of("role", "user", "content", prompt)
            ));
            requestBody.put("temperature", 0.7);
            requestBody.put("max_tokens", 1000);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", "Bearer " + apiKey);
            headers.set("Content-Type", "application/json");

            org.springframework.http.HttpEntity<Map<String, Object>> request = 
                new org.springframework.http.HttpEntity<>(requestBody, headers);

            String url = baseUrl + "/chat/completions";
            Map response = restTemplate.postForObject(url, request, Map.class);
            
            if (response != null && response.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }
            log.warn("Groq API returned unexpected response, using local analysis");
            return generateLocalAnalysis(prompt);
        } catch (Exception e) {
            log.error("Error calling Groq API: {}", e.getMessage());
            return generateLocalAnalysis(prompt);
        }
    }

    private String generateLocalAnalysis(String prompt) {
        StringBuilder sb = new StringBuilder();
        sb.append("Inspection Analysis Report\n\n");

        String status = "";
        String orgName = "";
        String inspectorName = "";
        String scheduledDate = "";

        for (String line : prompt.split("\n")) {
            if (line.startsWith("Status: ")) status = line.substring(8).trim();
            else if (line.startsWith("organization: ")) orgName = line.substring(14).trim();
            else if (line.startsWith("INSPECTOR: ")) inspectorName = line.substring(11).trim();
            else if (line.startsWith("DATE: ") && scheduledDate.isEmpty()) scheduledDate = line.substring(6).trim();
            else if (line.startsWith("Scheduled Date: ")) scheduledDate = line.substring(16).trim();
        }
        
        if ("SCHEDULED".equalsIgnoreCase(status)) {
            sb.append("Status: Scheduled — inspection has not yet been conducted.\n");
            sb.append("Scheduled Date: ").append(scheduledDate.isEmpty() ? "Not set" : scheduledDate).append("\n");
            if (!inspectorName.isEmpty() && !"Not Assigned".equals(inspectorName)) {
                sb.append("Assigned Inspector: ").append(inspectorName).append("\n");
            }
            sb.append("\nPre-Inspection Recommendations:\n");
            sb.append("- Verify all required documentation is prepared and ready for review\n");
            sb.append("- Ensure compliance records are up-to-date and accessible\n");
            sb.append("- Confirm the scheduled date and availability of key personnel\n");
            sb.append("- Review previous inspection findings if applicable\n");
            sb.append("\nOverall Assessment: PENDING — Awaiting inspection execution.\n");
        } else if (prompt.contains("No findings recorded")) {
            sb.append("Status: No findings have been recorded for this inspection yet.\n");
            sb.append("Recommendation: Schedule follow-up with the assigned inspector to document observations.\n");
            sb.append("Overall Assessment: INCONCLUSIVE — Awaiting findings.\n");
        } else {
            boolean hasHigh = prompt.contains("Severity: HIGH") || prompt.contains("Severity: High");
            boolean hasMedium = prompt.contains("Severity: MEDIUM") || prompt.contains("Severity: Medium");
            boolean hasLow = prompt.contains("Severity: LOW") || prompt.contains("Severity: Low");
            
            if (hasHigh) {
                sb.append("Key Risk Areas: High-severity findings detected that require immediate attention.\n");
            }
            if (hasMedium) {
                sb.append("Moderate risk areas identified that should be addressed within 30 days.\n");
            }
            if (hasLow) {
                sb.append("Low-severity observations noted for continuous improvement.\n");
            }
            
            sb.append("\nRecommended Actions:\n");
            if (hasHigh) sb.append("- Escalate high-severity findings to regulatory board\n");
            if (hasMedium) sb.append("- Schedule corrective action plan for medium-severity items\n");
            if (hasLow) sb.append("- Document low-severity items in continuous improvement log\n");
            sb.append("- Require formal response from the regulated entity within 14 business days\n");
            sb.append("- Schedule follow-up inspection to verify remediation\n");
            
            sb.append("\nOverall Assessment: ");
            if (hasHigh) sb.append("NON_COMPLIANT — Critical issues require enforcement action.");
            else if (hasMedium) sb.append("PARTIALLY_COMPLIANT — Improvements needed before next review cycle.");
            else sb.append("COMPLIANT — All findings within acceptable parameters.");
        }
        
        return sb.toString();
    }

    private InspectionResponse mapToResponse(Inspection inspection) {
        return new InspectionResponse(
                inspection.getId(),
                inspection.getOrganization() != null ? inspection.getOrganization().getId() : null,
                inspection.getOrganization() != null ? inspection.getOrganization().getName() : null,
                inspection.getInspector() != null ? inspection.getInspector().getId() : null,
                inspection.getInspector() != null ? inspection.getInspector().getFullName() : null,
                inspection.getScheduledDate(),
                inspection.getStatus(),
                inspection.getCreatedAt(),
                inspection.getUpdatedAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<InspectionFindingResponse> getFindingsByInspectionId(UUID inspectionId) {
        log.info("Fetching findings for inspection: {}", inspectionId);
        Inspection inspection = inspectionRepository.findById(inspectionId).orElse(null);
        String defaultInspectorName = (inspection != null && inspection.getInspector() != null)
                ? inspection.getInspector().getFullName() : "Assigned Inspector";

        return findingRepository.findByInspectionId(inspectionId).stream()
                .map(finding -> {
                    String recorderName = finding.getCreatedBy() != null ? finding.getCreatedBy().getFullName() : defaultInspectorName;
                    return InspectionFindingResponse.builder()
                            .id(finding.getId())
                            .inspectionId(inspectionId)
                            .description(finding.getDescription())
                            .severity(finding.getSeverity())
                            .status(finding.getStatus())
                            .createdById(finding.getCreatedBy() != null ? finding.getCreatedBy().getId() : null)
                            .createdByName(recorderName)
                            .createdAt(finding.getCreatedAt())
                            .updatedAt(finding.getUpdatedAt())
                            .requirementId(finding.getRequirement() != null ? finding.getRequirement().getId() : null)
                            .requirementTitle(finding.getRequirement() != null ? finding.getRequirement().getTitle() : null)
                            .build();
                })
                .collect(Collectors.toList());
    }
}

