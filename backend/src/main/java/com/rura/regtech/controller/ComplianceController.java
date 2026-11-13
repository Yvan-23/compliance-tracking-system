package com.rura.regtech.controller;

import com.rura.regtech.config.TenantContext;
import com.rura.regtech.config.TenantUtils;
import com.rura.regtech.dto.request.WaiverRequestDto;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.ComplianceRecordResponse;
import com.rura.regtech.service.ComplianceTrackingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/compliance")
@RequiredArgsConstructor
@Slf4j
public class ComplianceController {

    private final ComplianceTrackingService complianceService;

    @PostMapping("/organization/{organizationId}/initialize")
    public ResponseEntity<ApiResponse<Void>> initializeCompliance(@PathVariable UUID organizationId) {
        log.info("Initializing compliance for organization: {}", organizationId);
        complianceService.initializeComplianceCycle(organizationId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Compliance cycle initialized successfully", null));
    }

    @GetMapping("/organization/{organizationId}/score")
    public ResponseEntity<ApiResponse<Double>> getComplianceScore(@PathVariable UUID organizationId) {
        double score = complianceService.computeComplianceScore(organizationId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance score calculated successfully", score));
    }

    @GetMapping("/record/{id}")
    public ResponseEntity<ApiResponse<ComplianceRecordResponse>> getComplianceRecord(@PathVariable UUID id) {
        ComplianceRecordResponse response = complianceService.getComplianceRecordById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance record fetched successfully", response));
    }

    @PostMapping("/record/{id}/non-compliant")
    public ResponseEntity<ApiResponse<Void>> markNonCompliant(
            @PathVariable UUID id,
            @RequestParam String reason) {
        complianceService.markAsNonCompliant(id, reason);
        return ResponseEntity.ok(new ApiResponse<>(true, "Record marked as non-compliant", null));
    }

    @PostMapping("/record/{id}/revert")
    public ResponseEntity<ApiResponse<Void>> revertCompliance(
            @PathVariable UUID id) {
        UUID userId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
        complianceService.revertCompliance(id, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance reverted to pending", null));
    }

    @PostMapping("/record/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveCompliance(
            @PathVariable UUID id) {
        UUID userId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
        complianceService.approveCompliance(id, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance approved successfully", null));
    }

    @PostMapping("/record/{id}/waiver")
    public ResponseEntity<ApiResponse<Void>> processWaiver(
            @PathVariable UUID id,
            @Valid @RequestBody WaiverRequestDto request) {
        UUID userId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
        complianceService.processWaiverRequest(id, userId, request.isApproved(), request.getComment());
        return ResponseEntity.ok(new ApiResponse<>(true, "Waiver processed successfully", null));
    }

    @GetMapping("/organization/{organizationId}/records")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<ComplianceRecordResponse>>> getComplianceRecords(
            @PathVariable UUID organizationId,
            @org.springframework.data.web.PageableDefault(size = 20) org.springframework.data.domain.Pageable pageable) {
        TenantUtils.assertTenantMatch(organizationId, "Access denied: you cannot access another organization's records");
        org.springframework.data.domain.Page<ComplianceRecordResponse> response = complianceService
                .getComplianceRecordsByOrganization(organizationId, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance records fetched successfully", response));
    }

    @GetMapping("/records")
    public ResponseEntity<ApiResponse<Page<ComplianceRecordResponse>>> getAllComplianceRecords(
            @PageableDefault(size = 50) Pageable pageable) {
        UUID tenantId = TenantContext.getTenantId();
        Page<ComplianceRecordResponse> response;
        if (tenantId != null) {
            response = complianceService.getComplianceRecordsByOrganization(tenantId, pageable);
        } else {
            response = complianceService.getAllComplianceRecords(pageable);
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance records fetched successfully", response));
    }

    @PostMapping("/ensure-record")
    public ResponseEntity<ApiResponse<UUID>> ensureComplianceRecord(
            @RequestParam UUID organizationId,
            @RequestParam UUID requirementId) {
        UUID recordId = complianceService.ensureComplianceRecord(organizationId, requirementId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance record ensured", recordId));
    }

    @PostMapping("/recalculate")
    public ResponseEntity<ApiResponse<Void>> recalculateAllStatuses() {
        complianceService.recalculateAllStatuses();
        return ResponseEntity.ok(new ApiResponse<>(true, "Recalculation triggered successfully", null));
    }
}
