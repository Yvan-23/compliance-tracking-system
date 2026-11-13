package com.rura.regtech.controller;


import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.service.ComplianceRecalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/compliance-recalculation")
@RequiredArgsConstructor
public class ComplianceRecalculationController {

    private final ComplianceRecalculationService recalculationService;

    @PostMapping("/trigger-nightly")
    public ResponseEntity<ApiResponse<String>> triggerNightlyRecalculation() {
        recalculationService.performNightlyRecalculation();

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Nightly recalculation triggered successfully",
                "Check audit logs for execution summary"));
    }
}
