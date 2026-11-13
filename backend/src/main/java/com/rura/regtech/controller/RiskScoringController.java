package com.rura.regtech.controller;

import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.entity.enums.RiskLevel;
import com.rura.regtech.service.RiskScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/risk-scoring")
@RequiredArgsConstructor
public class RiskScoringController {

    private final RiskScoringService riskScoringService;

    @GetMapping("/organizations/{organizationId}/score")
    public ResponseEntity<ApiResponse<Map<String, Object>>> calculateRiskScore(
            @PathVariable UUID organizationId) {

        double riskScore = riskScoringService.calculateRiskScore(organizationId);
        RiskLevel riskLevel = riskScoringService.determineRiskLevel(riskScore);

        Map<String, Object> result = new HashMap<>();
        result.put("organizationId", organizationId);
        result.put("riskScore", riskScore);
        result.put("riskLevel", riskLevel.name());

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Risk score calculated successfully",
                result));
    }

    @PostMapping("/organizations/{organizationId}/update")
    public ResponseEntity<ApiResponse<String>> updateOrganizationRiskScore(
            @PathVariable UUID organizationId) {

        riskScoringService.updateOrganizationRiskScore(organizationId);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Risk score updated and saved",
                null));
    }

    @GetMapping("/risk-level")
    public ResponseEntity<ApiResponse<String>> determineRiskLevel(@RequestParam double score) {
        RiskLevel riskLevel = riskScoringService.determineRiskLevel(score);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Risk level determined",
                riskLevel.name()));
    }
}
