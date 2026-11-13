package com.rura.regtech.controller;

import com.rura.regtech.dto.request.ComplianceRequirementRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.ComplianceRequirementResponse;
import com.rura.regtech.service.ComplianceRequirementService;
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
@RequestMapping("/api/v1/requirements")
@RequiredArgsConstructor
@Slf4j
public class ComplianceRequirementController {

    private final ComplianceRequirementService requirementService;

    @PostMapping
    public ResponseEntity<ApiResponse<ComplianceRequirementResponse>> createRequirement(
            @Valid @RequestBody ComplianceRequirementRequest request) {
        log.info("REST request to create ComplianceRequirement");
        ComplianceRequirementResponse response = requirementService.createRequirement(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Compliance Requirement created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ComplianceRequirementResponse>> getRequirementById(@PathVariable UUID id) {
        log.info("REST request to get ComplianceRequirement : {}", id);
        ComplianceRequirementResponse response = requirementService.getRequirementById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance Requirement fetched successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ComplianceRequirementResponse>>> getAllRequirements(
            @PageableDefault(size = 20) Pageable pageable) {
        log.info("REST request to get all ComplianceRequirements");
        Page<ComplianceRequirementResponse> response = requirementService.getAllRequirements(pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance Requirements fetched successfully", response));
    }

    @GetMapping("/regulation/{regulationId}")
    public ResponseEntity<ApiResponse<Page<ComplianceRequirementResponse>>> getRequirementsByRegulation(
            @PathVariable UUID regulationId,
            @PageableDefault(size = 20) Pageable pageable) {
        log.info("REST request to get ComplianceRequirements by Regulation : {}", regulationId);
        Page<ComplianceRequirementResponse> response = requirementService.getRequirementsByRegulation(regulationId,
                pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance Requirements fetched successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ComplianceRequirementResponse>> updateRequirement(
            @PathVariable UUID id,
            @Valid @RequestBody ComplianceRequirementRequest request) {
        log.info("REST request to update ComplianceRequirement : {}", id);
        ComplianceRequirementResponse response = requirementService.updateRequirement(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance Requirement updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRequirement(@PathVariable UUID id) {
        log.info("REST request to delete ComplianceRequirement : {}", id);
        requirementService.deleteRequirement(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance Requirement deleted successfully", null));
    }
}
