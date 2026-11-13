package com.rura.regtech.controller;


import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.service.EscalationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/escalations")
@RequiredArgsConstructor
public class EscalationController {

    private final EscalationService escalationService;

    @PostMapping("/process-all")
    public ResponseEntity<ApiResponse<String>> processAllEscalations() {
        escalationService.processEscalations();

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "All escalations processed",
                null));
    }

    @PostMapping("/compliance-records/{complianceRecordId}/escalate")
    public ResponseEntity<ApiResponse<String>> escalateComplianceRecord(
            @PathVariable UUID complianceRecordId) {

        escalationService.escalateComplianceRecord(complianceRecordId);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Compliance record escalation processed",
                null));
    }
}
