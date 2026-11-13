package com.rura.regtech.controller;

import com.rura.regtech.config.SecurityUtils;
import com.rura.regtech.dto.request.CompleteActionRequest;
import com.rura.regtech.dto.request.CorrectiveActionRequest;
import com.rura.regtech.dto.request.EnforcementActionRequest;
import com.rura.regtech.dto.request.PenaltyIssuanceRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.CorrectiveActionResponse;
import com.rura.regtech.dto.response.PenaltyCalculationResponse;
import com.rura.regtech.service.EnforcementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/enforcement")
@Slf4j
public class EnforcementController {

    private final EnforcementService enforcementService;

    public EnforcementController(EnforcementService enforcementService) {
        this.enforcementService = enforcementService;
    }

    @PostMapping("/findings/{findingId}/corrective-action")
    public ResponseEntity<ApiResponse<Void>> issueCorrectiveAction(
            @PathVariable UUID findingId,
            @Valid @RequestBody CorrectiveActionRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        log.info("Issuing corrective action for finding {} by user {}", findingId, userId);
        enforcementService.issueCorrectiveAction(findingId, request.getDescription(), userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Corrective action issued successfully", null));
    }

    @GetMapping("/actions/{actionId}")
    public ResponseEntity<ApiResponse<CorrectiveActionResponse>> getCorrectiveAction(@PathVariable UUID actionId) {
        CorrectiveActionResponse response = enforcementService.getCorrectiveAction(actionId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Corrective action fetched successfully", response));
    }

    @GetMapping("/findings/{findingId}/actions")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<CorrectiveActionResponse>>> getActionsByFinding(
            @PathVariable UUID findingId,
            @org.springframework.data.web.PageableDefault(size = 20) org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<CorrectiveActionResponse> response = enforcementService
                .getCorrectiveActionsByFinding(findingId, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Corrective actions fetched successfully", response));
    }

    @GetMapping("/actions")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<CorrectiveActionResponse>>> getAllActions(
            @org.springframework.data.web.PageableDefault(size = 20) org.springframework.data.domain.Pageable pageable) {
        UUID tenantId = com.rura.regtech.config.TenantContext.getTenantId();
        org.springframework.data.domain.Page<CorrectiveActionResponse> response;
        if (tenantId != null) {
            response = enforcementService.getCorrectiveActionsByOrganization(tenantId, pageable);
        } else {
            response = enforcementService.getAllCorrectiveActions(pageable);
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "All corrective actions fetched successfully", response));
    }

    @PostMapping(value = "/actions/{actionId}/submit-evidence", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Void>> submitCorrectiveActionEvidence(
            @PathVariable UUID actionId,
            @RequestParam("evidence") String evidence,
            @RequestParam(value = "file", required = false) org.springframework.web.multipart.MultipartFile file) {
        log.info("Submitting evidence for corrective action {}", actionId);
        enforcementService.submitCorrectiveActionEvidence(actionId, evidence, file);
        return ResponseEntity.ok(new ApiResponse<>(true, "Evidence submitted successfully for review", null));
    }

    @PostMapping("/actions/{actionId}/complete")
    public ResponseEntity<ApiResponse<Void>> completeCorrectiveAction(
            @PathVariable UUID actionId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        log.info("Completing corrective action {} by user {}", actionId, userId);
        enforcementService.markCorrectiveActionCompleted(actionId, userId, null);
        return ResponseEntity.ok(new ApiResponse<>(true, "Corrective action marked as completed", null));
    }

    @GetMapping("/violations/{violationId}/penalty")
    public ResponseEntity<ApiResponse<PenaltyCalculationResponse>> calculatePenalty(@PathVariable UUID violationId) {
        log.info("Calculating penalty for violation {}", violationId);
        PenaltyCalculationResponse response = enforcementService.calculatePenaltyDetails(violationId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Penalty calculated successfully", response));
    }

    @PostMapping("/violations/{violationId}/penalty")
    public ResponseEntity<ApiResponse<Void>> issuePenalty(
            @PathVariable UUID violationId,
            @Valid @RequestBody PenaltyIssuanceRequest request) {
        log.info("Issuing penalty for violation {}", violationId);
        enforcementService.issuePenalty(violationId, request.getAmount());
        return ResponseEntity.ok(new ApiResponse<>(true, "Penalty issued successfully", null));
    }

    @PostMapping("/cases/{caseId}/close")
    public ResponseEntity<ApiResponse<Void>> closeCase(@PathVariable UUID caseId) {
        log.info("Closing enforcement case {}", caseId);
        enforcementService.closeEnforcementCase(caseId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Case closed successfully", null));
    }

    @PostMapping("/actions")
    public ResponseEntity<ApiResponse<Void>> createEnforcementAction(
            @Valid @RequestBody EnforcementActionRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        log.info("Creating enforcement action for org {}: {} by user {}", request.getOrganizationId(), request.getActionType(), userId);
        enforcementService.createEnforcementAction(
                request.getOrganizationId(),
                request.getComplianceRecordId(),
                request.getActionType(),
                request.getSeverity(),
                request.getPenaltyAmount(),
                request.getDescription(),
                userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Enforcement action created successfully", null));
    }
}
