package com.rura.regtech.controller;

import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.AuditLogResponse;
import com.rura.regtech.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Slf4j
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @PageableDefault(size = 50) Pageable pageable) {
        Page<AuditLogResponse> response;
        if (search != null || action != null || entityType != null || startDate != null || endDate != null) {
            response = auditLogService.searchAuditLogs(search, action, entityType, startDate, endDate, pageable);
        } else {
            response = auditLogService.getAllAuditLogs(pageable);
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "Audit logs fetched successfully", response));
    }
}
