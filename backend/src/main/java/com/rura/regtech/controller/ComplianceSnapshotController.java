package com.rura.regtech.controller;


import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.ComplianceSnapshotResponse;
import com.rura.regtech.service.ComplianceSnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/compliance-snapshots")
@RequiredArgsConstructor
public class ComplianceSnapshotController {

    private final ComplianceSnapshotService snapshotService;

    @GetMapping("/organizations/{organizationId}")
    public ResponseEntity<ApiResponse<ComplianceSnapshotResponse>> generateSnapshot(
            @PathVariable UUID organizationId) {

        ComplianceSnapshotResponse snapshot = snapshotService.generateComplianceSnapshot(organizationId);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Compliance snapshot generated successfully",
                snapshot));
    }
}
