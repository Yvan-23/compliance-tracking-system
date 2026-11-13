package com.rura.regtech.service;

import com.rura.regtech.dto.response.NotificationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface NotificationService {
    Page<NotificationResponse> getNotificationsByUser(UUID userId, Pageable pageable);

    void markAsRead(UUID notificationId);

    void markAllAsRead(UUID userId);

    long getUnreadCount(UUID userId);

    void createNotification(UUID userId, String title, String message, String type); // Internal use mostly
}
