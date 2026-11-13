package com.rura.regtech.controller;

import com.rura.regtech.dto.request.RegulationRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.RegulationResponse;
import com.rura.regtech.entity.enums.RegulationStatus;
import com.rura.regtech.service.RegulationService;
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
@RequestMapping("/api/v1/regulations")
@RequiredArgsConstructor
@Slf4j
public class RegulationController {

    private final RegulationService regulationService;

    @PostMapping
    public ResponseEntity<ApiResponse<RegulationResponse>> createRegulation(
            @Valid @RequestBody RegulationRequest request) {
        log.info("REST request to create Regulation");
        RegulationResponse response = regulationService.createRegulation(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Regulation created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RegulationResponse>> getRegulationById(@PathVariable UUID id) {
        log.info("REST request to get Regulation : {}", id);
        RegulationResponse response = regulationService.getRegulationById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Regulation fetched successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<RegulationResponse>>> getAllRegulations(
            @PageableDefault(size = 20) Pageable pageable) {
        log.info("REST request to get all Regulations");
        Page<RegulationResponse> response = regulationService.getAllRegulations(pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Regulations fetched successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RegulationResponse>> updateRegulation(@PathVariable UUID id,
            @Valid @RequestBody RegulationRequest request) {
        log.info("REST request to update Regulation : {}", id);
        RegulationResponse response = regulationService.updateRegulation(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Regulation updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(@PathVariable UUID id,
            @RequestParam RegulationStatus status) {
        log.info("REST request to update Regulation status : {}", id);
        regulationService.updateStatus(id, status);
        return ResponseEntity.ok(new ApiResponse<>(true, "Regulation status updated successfully", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRegulation(@PathVariable UUID id) {
        log.info("REST request to delete Regulation : {}", id);
        regulationService.deleteRegulation(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Regulation deleted successfully", null));
    }
}
