package com.rura.regtech.controller;

import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.entity.RiskRule;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.RiskRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/risk-rules")
@RequiredArgsConstructor
public class RiskRuleController {

    private final RiskRuleRepository riskRuleRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RiskRule>>> getAllRules() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Rules fetched successfully", riskRuleRepository.findAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RiskRule>> createRule(@RequestBody RiskRule rule) {
        if (rule.getRuleName() != null && riskRuleRepository.findByRuleName(rule.getRuleName()).isPresent()) {
            throw new IllegalArgumentException("Rule with name " + rule.getRuleName() + " already exists");
        }
        RiskRule saved = riskRuleRepository.save(rule);
        return ResponseEntity.created(URI.create("/api/v1/risk-rules/" + saved.getId()))
                .body(new ApiResponse<>(true, "Rule created successfully", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RiskRule>> updateRule(@PathVariable UUID id, @RequestBody RiskRule rule) {
        RiskRule existing = riskRuleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found with id: " + id));

        if (rule.getRiskWeight() != null)
            existing.setRiskWeight(rule.getRiskWeight());
        if (rule.getActive() != null)
            existing.setActive(rule.getActive());
        if (rule.getDescription() != null)
            existing.setDescription(rule.getDescription());

        RiskRule updated = riskRuleRepository.save(existing);
        return ResponseEntity.ok(new ApiResponse<>(true, "Rule updated successfully", updated));
    }
}
