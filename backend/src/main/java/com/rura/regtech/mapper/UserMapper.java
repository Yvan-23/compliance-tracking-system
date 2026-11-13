package com.rura.regtech.mapper;

import com.rura.regtech.dto.request.UserRequest;
import com.rura.regtech.dto.response.UserResponse;
import com.rura.regtech.entity.User;
import org.mapstruct.*;

import java.util.stream.Collectors;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface UserMapper {

    // Manual mapping method for Request to Entity
    default User toEntity(UserRequest request) {
        if (request == null) {
            return null;
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setStatus(request.getStatus());
        // password, id, organization, roles, timestamps handled in service

        return user;
    }

    // Manual mapping method for Entity to Response
    default UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }

        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getStatus(),
                user.getOrganization() != null ? user.getOrganization().getId() : null,
                user.getOrganization() != null ? user.getOrganization().getName() : null,
                user.getRoles() != null ? user.getRoles().stream()
                        .map(role -> role.getName().name())
                        .collect(Collectors.toSet()) : java.util.Set.of(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }

    // Manual update method
    default void updateEntityFromRequest(UserRequest request, User user) {
        if (request == null || user == null) {
            return;
        }

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }
        // password, organization, roles handled in service
    }
}
