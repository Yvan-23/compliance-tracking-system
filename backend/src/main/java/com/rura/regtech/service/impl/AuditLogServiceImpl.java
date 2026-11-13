package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.AuditLogResponse;
import com.rura.regtech.entity.AuditLog;
import com.rura.regtech.entity.User;
import com.rura.regtech.repository.AuditLogRepository;
import com.rura.regtech.service.AuditLogService;
import com.rura.regtech.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final SecurityUtils securityUtils;

    @Override
    public Page<AuditLogResponse> getAllAuditLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByTimestampDesc(pageable)
                .map(this::toResponse);
    }

    @Override
    public Page<AuditLogResponse> searchAuditLogs(String search, String action, String entityType,
                                                  LocalDateTime startDate, LocalDateTime endDate,
                                                  Pageable pageable) {
        String safeSearch = search == null ? "" : search;
        String safeAction = action == null ? "" : action;
        String safeEntityType = entityType == null ? "" : entityType;
        return auditLogRepository.searchLogs(safeSearch, safeAction, safeEntityType, startDate, endDate, pageable)
                .map(this::toResponse);
    }

    @Override
    public void log(String action, String entityType, UUID entityId, String details) {
        User currentUser = securityUtils.getCurrentUser();
        AuditLog auditLog = AuditLog.builder()
                .user(currentUser)
                .action(action)
                .entityType(entityType)
                .entityId(entityId != null ? entityId.toString() : null)
                .details(details)
                .ipAddress(getCurrentIp())
                .build();
        auditLogRepository.save(auditLog);
        log.debug("MANUAL AUDIT: {} | {} | {} | {}", action, entityType, entityId,
                currentUser != null ? currentUser.getEmail() : "system");
    }

    private String getCurrentIp() {
        try {
            var attrs = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attrs instanceof org.springframework.web.context.request.ServletRequestAttributes) {
                return ((org.springframework.web.context.request.ServletRequestAttributes) attrs)
                        .getRequest().getRemoteAddr();
            }
        } catch (Exception e) {
        }
        return null;
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId() != null ? log.getId().toString() : null)
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .userEmail(log.getUser() != null ? log.getUser().getEmail() : null)
                .userName(log.getUser() != null ? log.getUser().getFullName() : null)
                .timestamp(log.getTimestamp())
                .ipAddress(log.getIpAddress())
                .details(log.getDetails())
                .build();
    }
}
