package com.rura.regtech.controller;


import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.service.EvidenceIntegrityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/evidence-integrity")
@RequiredArgsConstructor
public class EvidenceIntegrityController {

    private final EvidenceIntegrityService evidenceIntegrityService;

    @PostMapping("/submissions/{submissionId}/generate-hash")
    public ResponseEntity<ApiResponse<Map<String, String>>> generateAndStoreHash(
            @PathVariable UUID submissionId,
            @RequestParam("file") MultipartFile file) throws Exception {

        byte[] fileContent = file.getBytes();
        String hash = evidenceIntegrityService.generateFileHash(fileContent);
        evidenceIntegrityService.storeFileHash(submissionId, hash);

        Map<String, String> result = new HashMap<>();
        result.put("submissionId", submissionId.toString());
        result.put("hash", hash);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "File hash generated and stored",
                result));
    }

    @PostMapping("/submissions/{submissionId}/verify")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyIntegrity(
            @PathVariable UUID submissionId,
            @RequestParam("file") MultipartFile file) throws Exception {

        byte[] fileContent = file.getBytes();
        boolean isValid = evidenceIntegrityService.verifyEvidenceIntegrity(submissionId, fileContent);

        Map<String, Object> result = new HashMap<>();
        result.put("submissionId", submissionId.toString());
        result.put("integrityValid", isValid);
        result.put("verified", true);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Evidence integrity verified successfully",
                result));
    }

    @PostMapping("/generate-hash")
    public ResponseEntity<ApiResponse<String>> generateHashOnly(
            @RequestParam("file") MultipartFile file) throws Exception {

        byte[] fileContent = file.getBytes();
        String hash = evidenceIntegrityService.generateFileHash(fileContent);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Hash generated",
                hash));
    }
}
