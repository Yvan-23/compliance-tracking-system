package com.rura.regtech.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rura.regtech.dto.request.EvidenceRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.EvidenceResponse;
import com.rura.regtech.dto.response.ExtractedData;
import com.rura.regtech.service.EvidenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/evidence")
@RequiredArgsConstructor
@Slf4j
public class EvidenceController {

    private final EvidenceService evidenceService;
    private final ObjectMapper objectMapper;

    @PostMapping
    public ResponseEntity<ApiResponse<EvidenceResponse>> createEvidence(
            @Valid @RequestBody EvidenceRequest request) {
        log.info("Creating evidence for organization {}", request.getOrganizationId());
        EvidenceResponse response = evidenceService.createEvidence(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Evidence created successfully", response));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EvidenceResponse>> createEvidenceWithFile(
            @RequestPart("file") MultipartFile file,
            @RequestPart("request") String requestJson) throws IOException {
        EvidenceRequest request = objectMapper.readValue(requestJson, EvidenceRequest.class);
        log.info("Creating evidence with file for organization {}", request.getOrganizationId());
        EvidenceResponse response = evidenceService.createEvidenceWithFile(request, file);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Evidence created with AI extraction", response));
    }

    @PostMapping("/{id}/ai-extract")
    public ResponseEntity<ApiResponse<EvidenceResponse>> runAiExtraction(
            @PathVariable UUID id) {
        log.info("Running AI extraction on evidence {}", id);
        EvidenceResponse response = evidenceService.runAiExtraction(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "AI extraction completed", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EvidenceResponse>> updateEvidence(
            @PathVariable UUID id,
            @Valid @RequestBody EvidenceRequest request) {
        log.info("Updating evidence {}", id);
        EvidenceResponse response = evidenceService.updateEvidence(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Evidence updated successfully", response));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadEvidence(@PathVariable UUID id) {
        try {
            byte[] data = evidenceService.downloadEvidenceBytes(id);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + id + ".pdf\"")
                    .body(data);
        } catch (com.rura.regtech.exception.ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EvidenceResponse>> getEvidence(@PathVariable UUID id) {
        log.info("Getting evidence {}", id);
        EvidenceResponse response = evidenceService.getEvidence(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Evidence fetched", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<EvidenceResponse>>> getAllEvidence(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<EvidenceResponse> response = evidenceService.getAllEvidence(status, documentType, search, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "All evidence fetched", response));
    }

    @GetMapping("/organization/{organizationId}")
    public ResponseEntity<ApiResponse<Page<EvidenceResponse>>> getEvidenceByOrganization(
            @PathVariable UUID organizationId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<EvidenceResponse> response = evidenceService.getEvidenceByOrganization(
                organizationId, status, documentType, search, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Evidence fetched", response));
    }

    @GetMapping("/organization/{organizationId}/expiring")
    public ResponseEntity<ApiResponse<List<EvidenceResponse>>> getExpiringEvidence(
            @PathVariable UUID organizationId,
            @RequestParam(defaultValue = "30") int daysThreshold) {
        List<EvidenceResponse> response = evidenceService.getExpiringEvidence(organizationId, daysThreshold);
        return ResponseEntity.ok(new ApiResponse<>(true, "Expiring evidence fetched", response));
    }

    @GetMapping("/organization/{organizationId}/expired")
    public ResponseEntity<ApiResponse<List<EvidenceResponse>>> getExpiredEvidence(
            @PathVariable UUID organizationId) {
        List<EvidenceResponse> response = evidenceService.getExpiredEvidence(organizationId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Expired evidence fetched", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEvidence(@PathVariable UUID id) {
        log.info("Deleting evidence {}", id);
        evidenceService.deleteEvidence(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Evidence deleted", null));
    }

    @GetMapping("/organization/{organizationId}/stats")
    public ResponseEntity<ApiResponse<EvidenceStatsResponse>> getEvidenceStats(
            @PathVariable UUID organizationId) {
        long expired = evidenceService.countExpiredEvidence(organizationId);
        long expiringSoon = evidenceService.countExpiringSoonEvidence(organizationId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Evidence stats fetched",
                new EvidenceStatsResponse(expired, expiringSoon)));
    }

    public record EvidenceStatsResponse(long expired, long expiringSoon) {
    }
}
