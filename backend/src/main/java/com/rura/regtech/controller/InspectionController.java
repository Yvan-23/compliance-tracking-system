package com.rura.regtech.controller;

import com.rura.regtech.config.TenantContext;
import com.rura.regtech.config.TenantUtils;
import com.rura.regtech.dto.request.InspectionRequest;
import com.rura.regtech.dto.request.InspectionFindingRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.InspectionResponse;
import com.rura.regtech.dto.response.InspectionFindingResponse;
import com.rura.regtech.service.InspectionService;
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
@RequestMapping("/api/v1/inspections")
@RequiredArgsConstructor
@Slf4j
public class InspectionController {

    private final InspectionService inspectionService;

    @PostMapping
    public ResponseEntity<ApiResponse<InspectionResponse>> createInspection(
            @Valid @RequestBody InspectionRequest request) {
        log.info("REST request to create Inspection");
        InspectionResponse response = inspectionService.createInspection(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Inspection created successfully", response));
    }

    @PostMapping("/{id}/findings")
    public ResponseEntity<ApiResponse<InspectionFindingResponse>> addFinding(
            @PathVariable UUID id,
            @Valid @RequestBody InspectionFindingRequest request) {
        log.info("REST request to add finding to Inspection: {}", id);
        InspectionFindingResponse response = inspectionService.addFinding(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Finding added successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InspectionResponse>> getInspectionById(@PathVariable UUID id) {
        log.info("REST request to get Inspection : {}", id);
        InspectionResponse response = inspectionService.getInspectionById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Inspection fetched successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<InspectionResponse>>> getAllInspections(
            @PageableDefault(size = 20) Pageable pageable) {
        log.info("REST request to get all Inspections");
        UUID tenantId = TenantContext.getTenantId();
        Page<InspectionResponse> response;
        if (tenantId != null) {
            response = inspectionService.getInspectionsByOrganization(tenantId, pageable);
        } else {
            response = inspectionService.getAllInspections(pageable);
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "Inspections fetched successfully", response));
    }

    @GetMapping("/organization/{organizationId}")
    public ResponseEntity<ApiResponse<Page<InspectionResponse>>> getInspectionsByOrganization(
            @PathVariable UUID organizationId,
            @PageableDefault(size = 20) Pageable pageable) {
        log.info("REST request to get Inspections by Organization : {}", organizationId);
        TenantUtils.assertTenantMatch(organizationId, "Access denied: you cannot access another organization's data");
        Page<InspectionResponse> response = inspectionService.getInspectionsByOrganization(organizationId, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Inspections fetched successfully", response));
    }

    @GetMapping("/inspector/{inspectorId}")
    public ResponseEntity<ApiResponse<Page<InspectionResponse>>> getInspectionsByInspector(
            @PathVariable UUID inspectorId,
            @PageableDefault(size = 20) Pageable pageable) {
        log.info("REST request to get Inspections by Inspector : {}", inspectorId);
        Page<InspectionResponse> response = inspectionService.getInspectionsByInspector(inspectorId, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Inspections fetched successfully", response));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<InspectionResponse>> updateStatus(
            @PathVariable UUID id,
            @RequestParam String status) {
        log.info("REST request to update Inspection status : {}", id);
        InspectionResponse response = inspectionService.updateInspectionStatus(id, status);
        return ResponseEntity.ok(new ApiResponse<>(true, "Inspection status updated successfully", response));
    }

    @PutMapping("/{id}/assign-inspector")
    public ResponseEntity<ApiResponse<InspectionResponse>> assignInspector(
            @PathVariable UUID id,
            @RequestParam UUID inspectorId) {
        log.info("REST request to assign inspector {} to Inspection {}", inspectorId, id);
        InspectionResponse response = inspectionService.assignInspector(id, inspectorId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Inspector assigned successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<InspectionResponse>> updateInspection(
            @PathVariable UUID id,
            @Valid @RequestBody InspectionRequest request) {
        log.info("REST request to update Inspection: {}", id);
        InspectionResponse response = inspectionService.updateInspection(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Inspection updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteInspection(@PathVariable UUID id) {
        log.info("REST request to delete Inspection: {}", id);
        inspectionService.deleteInspection(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Inspection deleted successfully", null));
    }

    @GetMapping("/{id}/ai-analysis")
    public ResponseEntity<ApiResponse<String>> generateAIAnalysis(@PathVariable UUID id) {
        log.info("Generating AI analysis for Inspection {}", id);
        String analysis = inspectionService.generateAIAnalysis(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "AI analysis generated successfully", analysis));
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<ApiResponse<String>> generateReport(@PathVariable UUID id) {
        log.info("Generating inspection report for Inspection {}", id);
        String report = inspectionService.generateInspectionReport(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Inspection report generated successfully", report));
    }

    @GetMapping("/{id}/findings")
    public ResponseEntity<ApiResponse<java.util.List<InspectionFindingResponse>>> getFindings(@PathVariable UUID id) {
        log.info("REST request to get findings for Inspection : {}", id);
        java.util.List<InspectionFindingResponse> response = inspectionService.getFindingsByInspectionId(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Findings fetched successfully", response));
    }
}

