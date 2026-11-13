package com.rura.regtech.controller;

import com.rura.regtech.config.TenantContext;
import com.rura.regtech.config.TenantUtils;
import com.rura.regtech.dto.request.ReviewRequest;
import com.rura.regtech.dto.request.SubmissionRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.SubmissionResponse;
import com.rura.regtech.service.SubmissionService;
import com.rura.regtech.security.RateLimited;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/submissions")
@Slf4j
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @RateLimited(requests = 10)
    @PostMapping("/draft")
    public ResponseEntity<ApiResponse<SubmissionResponse>> createDraft(
            @Valid @RequestBody SubmissionRequest request) {
        UUID userId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
        log.info("Creating draft submission for record {}", request.getComplianceRecordId());
        SubmissionResponse response = submissionService.createDraftSubmission(
                request.getComplianceRecordId(), userId, request.getInitialComment());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Draft created successfully", response));
    }

    @RateLimited(requests = 20)
    @PostMapping("/{id}/upload")
    public ResponseEntity<ApiResponse<Void>> uploadEvidence(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        log.info("Uploading evidence for submission {}", id);
        submissionService.uploadEvidence(id, file);
        return ResponseEntity.ok(new ApiResponse<>(true, "Evidence uploaded successfully", null));
    }

    @RateLimited(requests = 10)
    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submitReport(
            @PathVariable UUID id) {
        UUID userId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
        log.info("Submitting report {}", id);
        SubmissionResponse response = submissionService.submitComplianceReport(id, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Report submitted successfully", response));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<SubmissionResponse>> approveSubmission(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewRequest request) {
        UUID userId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
        log.info("Approving submission {}", id);
        SubmissionResponse response = submissionService.approveSubmission(id, userId, request.getComment());
        return ResponseEntity.ok(new ApiResponse<>(true, "Submission approved successfully", response));
    }

    // @PostMapping("/{id}/reject")
    // public ResponseEntity<ApiResponse<SubmissionResponse>> rejectSubmission(
    // @PathVariable UUID id,
    // @RequestParam UUID userId,
    // @Valid @RequestBody ReviewRequest request) {
    // log.info("Rejecting submission {}", id);
    // SubmissionResponse response = submissionService.rejectSubmission(id, userId,
    // request.getComment());
    // return ResponseEntity.ok(new ApiResponse<>(true, "Submission rejected
    // successfully", response));
    // }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<SubmissionResponse>> rejectSubmission(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewRequest request) {
        UUID userId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
        log.info("Rejecting submission {}", id);
        SubmissionResponse response = submissionService.rejectSubmission(id, userId, request.getComment());
        return ResponseEntity.ok(new ApiResponse<>(true, "Submission rejected successfully", response));
    }

    @GetMapping("/record/{recordId}")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<SubmissionResponse>>> getSubmissionsByRecord(
            @PathVariable UUID recordId,
            @org.springframework.data.web.PageableDefault(size = 20) org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<SubmissionResponse> response = submissionService
                .getSubmissionsByComplianceRecord(recordId, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Submissions fetched successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<SubmissionResponse>>> getAllSubmissions(
            @org.springframework.data.web.PageableDefault(size = 20) org.springframework.data.domain.Pageable pageable) {
        UUID tenantId = TenantContext.getTenantId();
        org.springframework.data.domain.Page<SubmissionResponse> response;
        if (tenantId != null) {
            response = submissionService.getSubmissionsByOrganization(tenantId, pageable);
        } else {
            response = submissionService.getAllSubmissions(pageable);
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "Submissions fetched successfully", response));
    }

    @GetMapping("/{id}/receipt")
    public ResponseEntity<ApiResponse<String>> generateReceipt(@PathVariable UUID id) {
        String receipt = submissionService.generateSubmissionReceipt(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Receipt generated successfully", receipt));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadEvidence(@PathVariable UUID id) {
        try {
            byte[] data = submissionService.downloadEvidenceBytes(id);
            String filename = id.toString() + ".pdf";
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(data);
        } catch (com.rura.regtech.exception.ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @RateLimited(requests = 10)
    @PostMapping("/{id}/reanalyze")
    public ResponseEntity<ApiResponse<SubmissionResponse>> reAnalyzeSubmission(@PathVariable UUID id) {
        log.info("Re-analyzing submission {}", id);
        SubmissionResponse response = submissionService.reAnalyzeSubmission(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Re-analysis complete", response));
    }

    @RateLimited(requests = 5)
    @PostMapping("/reanalyze-all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reanalyzeAllSubmissions() {
        log.info("Re-analyzing all submissions");
        Map<String, Object> result = submissionService.reanalyzeAllSubmissions();
        return ResponseEntity.ok(new ApiResponse<>(true, "Batch re-analysis complete", result));
    }
}
