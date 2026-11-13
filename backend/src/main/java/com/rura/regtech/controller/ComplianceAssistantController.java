package com.rura.regtech.controller;

import com.rura.regtech.dto.request.AssistantQueryRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.AssistantQueryResponse;
import com.rura.regtech.service.ComplianceAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assistant")
@RequiredArgsConstructor
@Slf4j
public class ComplianceAssistantController {

    private final ComplianceAssistantService complianceAssistantService;

    @PostMapping("/query")
    public ResponseEntity<ApiResponse<AssistantQueryResponse>> query(@Valid @RequestBody AssistantQueryRequest request) {
        log.info("Assistant query: {}", request.getQuery());
        AssistantQueryResponse response = complianceAssistantService.answerQuery(request.getQuery(), request.getMaxResults());
        return ResponseEntity.ok(new ApiResponse<>(true, "Query processed successfully", response));
    }
}
