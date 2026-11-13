package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.UserStatus;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public record UserResponse(
                UUID id,
                String fullName,
                String email,
                String phoneNumber,
                UserStatus status,
                UUID organizationId,
                String organizationName,
                Set<String> roles,
                LocalDateTime createdAt,
                LocalDateTime updatedAt) {
}
