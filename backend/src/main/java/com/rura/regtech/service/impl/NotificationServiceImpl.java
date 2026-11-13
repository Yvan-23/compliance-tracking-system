package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.NotificationResponse;
import com.rura.regtech.entity.Notification;
import com.rura.regtech.entity.User;
import com.rura.regtech.entity.enums.NotificationType;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.NotificationRepository;
import com.rura.regtech.repository.UserRepository;
import com.rura.regtech.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotificationsByUser(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional
    public void markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        notification.setReadStatus(true);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(UUID userId) {
        log.info("Marking all notifications as read for user {}", userId);
        java.util.List<Notification> unread = notificationRepository.findByUserIdAndReadStatusFalse(userId);

        unread.forEach(n -> n.setReadStatus(true));
        notificationRepository.saveAll(unread);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadStatusFalse(userId);
    }

    @Override
    public void createNotification(UUID userId, String title, String message, String typeStr) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        NotificationType type;
        try {
            type = NotificationType.valueOf(typeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid notification type: {}, falling back to SYSTEM", typeStr);
            type = NotificationType.SYSTEM;
        }

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .readStatus(false)
                .build();

        notificationRepository.save(notification);
        log.info("Created notification for user {}: {}", userId, title);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                notification.isReadStatus(),
                notification.getCreatedAt()
        );
    }

}