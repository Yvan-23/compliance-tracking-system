package com.rura.regtech.controller;


import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.service.ComplianceStateMachineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/compliance-state")
@RequiredArgsConstructor
public class ComplianceStateMachineController {

    private final ComplianceStateMachineService stateMachineService;

    @PostMapping("/{complianceRecordId}/transition")
    public ResponseEntity<ApiResponse<String>> transitionStatus(
            @PathVariable UUID complianceRecordId,
            @RequestParam ComplianceStatus newStatus) {

        stateMachineService.transitionStatus(complianceRecordId, newStatus);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Status transitioned successfully to " + newStatus,
                null));
    }

    @GetMapping("/validate-transition")
    public ResponseEntity<ApiResponse<Boolean>> validateTransition(
            @RequestParam ComplianceStatus currentStatus,
            @RequestParam ComplianceStatus newStatus) {

        boolean isValid = stateMachineService.isValidTransition(currentStatus, newStatus);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Transition validation result",
                isValid));
    }
}
