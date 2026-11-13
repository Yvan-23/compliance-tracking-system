package com.rura.regtech.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private String id;
    private String action;
    private String entityType;
    private String entityId;
    private String userEmail;
    private String userName;
    private LocalDateTime timestamp;
    private String ipAddress;
    private String details;
}