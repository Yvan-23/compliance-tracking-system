package com.rura.regtech.service;

import com.rura.regtech.dto.response.AuditLogResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.UUID;

public interface AuditLogService {
    Page<AuditLogResponse> getAllAuditLogs(Pageable pageable);

    Page<AuditLogResponse> searchAuditLogs(String search, String action, String entityType,
                                           LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    void log(String action, String entityType, UUID entityId, String details);
}
