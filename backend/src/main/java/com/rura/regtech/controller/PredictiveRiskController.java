package com.rura.regtech.controller;


import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.entity.PredictiveRiskAssessment;
import com.rura.regtech.service.PredictiveRiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/predictive-risk")
@RequiredArgsConstructor
public class PredictiveRiskController {

    private final PredictiveRiskService predictiveRiskService;

    @PostMapping("/organizations/{organizationId}/evaluate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> evaluateRisk(
            @PathVariable UUID organizationId) {

        boolean likelyToFail = predictiveRiskService.evaluatePredictiveRisk(organizationId);
        PredictiveRiskAssessment assessment = predictiveRiskService.getLatestAssessment(organizationId);

        Map<String, Object> result = new HashMap<>();
        result.put("organizationId", organizationId);
        result.put("likelyToFailNextDeadline", likelyToFail);
        result.put("reasoning", assessment != null ? assessment.getReasoning() : "No assessment available");
        result.put("assessedAt", assessment != null ? assessment.getAssessedAt() : null);

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Predictive risk evaluated",
                result));
    }

    @GetMapping("/organizations/{organizationId}/latest")
    public ResponseEntity<ApiResponse<PredictiveRiskAssessment>> getLatestAssessment(
            @PathVariable UUID organizationId) {

        PredictiveRiskAssessment assessment = predictiveRiskService.getLatestAssessment(organizationId);

        if (assessment == null) {
            return ResponseEntity.ok(new ApiResponse<>(
                    false,
                    "No assessment found for this organization",
                    null));
        }

        return ResponseEntity.ok(new ApiResponse<>(
                true,
                "Latest assessment retrieved",
                assessment));
    }
}
