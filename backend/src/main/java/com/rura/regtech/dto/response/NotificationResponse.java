package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.NotificationType;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
                UUID id,
                String title,
                String message,
                NotificationType type,
                boolean readStatus,
                LocalDateTime createdAt) {
}
