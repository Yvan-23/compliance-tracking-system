package com.rura.regtech.service.impl;

import com.rura.regtech.dto.request.UserRequest;
import com.rura.regtech.dto.response.UserResponse;
import com.rura.regtech.entity.Organization;
import com.rura.regtech.entity.Role;
import com.rura.regtech.entity.User;
import com.rura.regtech.exception.DuplicateResourceException;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.exception.ComplianceRuleViolationException;
import com.rura.regtech.mapper.UserMapper;
import com.rura.regtech.repository.*;
import com.rura.regtech.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrganizationRepository organizationRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final NotificationRepository notificationRepository;
    private final SubmissionRepository submissionRepository;
    private final InspectionRepository inspectionRepository;
    private final InspectionFindingRepository inspectionFindingRepository;
    private final AuditLogRepository auditLogRepository;
    private final ApprovalRepository approvalRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final com.rura.regtech.service.AuditLogService auditLogService;

    @Override
    @Transactional
    public UserResponse createUser(UserRequest request) {
        log.info("Creating user with email: {}", request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists: " + request.getEmail());
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        assignOrganization(user, request.getOrganizationId());
        assignRoles(user, request.getRoleIds());

        User savedUser = userRepository.save(user);
        return userMapper.toResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse partialUpdateUserByEmail(String email, com.rura.regtech.dto.request.UserPatchRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        User updated = userRepository.save(user);
        return userMapper.toResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(userMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsersByRole(Pageable pageable, String role) {
        if (role == null || role.isBlank()) {
            return getAllUsers(pageable);
        }
        try {
            com.rura.regtech.entity.enums.RoleName roleName = com.rura.regtech.entity.enums.RoleName.valueOf(role.toUpperCase());
            return userRepository.findByRoleName(roleName, pageable)
                    .map(userMapper::toResponse);
        } catch (IllegalArgumentException e) {
            return userRepository.findAll(pageable)
                    .map(userMapper::toResponse);
        }
    }

    @Override
    @Transactional
    public UserResponse updateUser(UUID id, UserRequest request) {
        log.info("Updating user with id: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists: " + request.getEmail());
        }

        // Use mapper for partial update
        userMapper.updateEntityFromRequest(request, user);

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        // Only update organization if provided
        if (request.getOrganizationId() != null) {
            assignOrganization(user, request.getOrganizationId());
        }

        // Only update roles if provided
        if (request.getRoleIds() != null) {
            assignRoles(user, request.getRoleIds());
        }

        User updatedUser = userRepository.save(user);
        return userMapper.toResponse(updatedUser);
    }

    @Override
    @Transactional
    public UserResponse partialUpdateUser(UUID id, com.rura.regtech.dto.request.UserPatchRequest request) {
        log.info("Partially updating user with id: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // Update only non-null fields
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }

        if (request.getEmail() != null) {
            // Check if email already exists for another user
            if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Email already exists: " + request.getEmail());
            }
            user.setEmail(request.getEmail());
        }

        if (request.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }

        if (request.getOrganizationId() != null) {
            assignOrganization(user, request.getOrganizationId());
        }

        if (request.getRoleIds() != null) {
            assignRoles(user, request.getRoleIds());
        }

        if (request.getStatus() != null) {
            user.setStatus(com.rura.regtech.entity.enums.UserStatus.valueOf(request.getStatus().toUpperCase()));
        }

        User updatedUser = userRepository.save(user);
        log.info("User partially updated: {}", updatedUser.getId());
        return userMapper.toResponse(updatedUser);
    }

    @Override
    @Transactional
    public void deleteUser(UUID id) {
        log.info("Deleting user with id: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        UUID currentUserId = com.rura.regtech.config.SecurityUtils.getCurrentUserId();
        if (currentUserId != null && currentUserId.equals(id)) {
            throw new ComplianceRuleViolationException("Cannot delete your own active account while logged in.");
        }

        // Explicitly record audit log BEFORE deleting user entity
        try {
            auditLogService.log("DELETE", "USER", id, "Deleted user: " + user.getFullName() + " (" + user.getEmail() + ")");
        } catch (Exception e) {
            log.error("Failed to log user deletion audit event", e);
        }

        // Clean up references across entities to prevent FK constraint violations
        try {
            notificationRepository.deleteByUserId(id);
            if (user.getEmail() != null) {
                passwordResetRepository.deleteByEmail(user.getEmail());
            }
            auditLogRepository.nullifyUserByUserId(id);
            submissionRepository.nullifySubmittedByUserId(id);
            inspectionRepository.nullifyInspectorId(id);
            inspectionFindingRepository.nullifyCreatedByUserId(id);
            approvalRepository.nullifyApproverByUserId(id);

            user.getRoles().clear();
            user.setOrganization(null);
            userRepository.saveAndFlush(user);

            userRepository.delete(user);
            userRepository.flush();
            log.info("User {} deleted successfully", id);
        } catch (Exception e) {
            log.warn("Direct hard delete for user {} encountered constraint: {}. Deactivating user account instead.", id, e.getMessage());
            user.setStatus(com.rura.regtech.entity.enums.UserStatus.INACTIVE);
            user.setOrganization(null);
            user.getRoles().clear();
            userRepository.save(user);
        }
    }

    @Override
    @Transactional
    public UserResponse activateUser(UUID id) {
        log.info("Activating user with id: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setStatus(com.rura.regtech.entity.enums.UserStatus.ACTIVE);
        user.setSuspendedUntil(null);
        User updatedUser = userRepository.save(user);
        log.info("User activated: {}", updatedUser.getId());
        return userMapper.toResponse(updatedUser);
    }

    @Override
    @Transactional
    public UserResponse deactivateUser(UUID id) {
        log.info("Deactivating user with id: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setStatus(com.rura.regtech.entity.enums.UserStatus.INACTIVE);
        user.setSuspendedUntil(null);
        User updatedUser = userRepository.save(user);
        log.info("User deactivated: {}", updatedUser.getId());
        return userMapper.toResponse(updatedUser);
    }

    @Override
    @Transactional
    public UserResponse suspendUser(UUID id, java.time.LocalDate suspendedUntil) {
        log.info("Suspending user with id: {} until {}", id, suspendedUntil);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setStatus(com.rura.regtech.entity.enums.UserStatus.SUSPENDED);
        user.setSuspendedUntil(
                suspendedUntil.atStartOfDay());
        User updatedUser = userRepository.save(user);
        log.info("User suspended: {} until {}", updatedUser.getId(), suspendedUntil);
        return userMapper.toResponse(updatedUser);
    }

    private void assignOrganization(User user, UUID organizationId) {
        if (organizationId != null) {
            Organization organization = organizationRepository.findById(organizationId)
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Organization not found with id: " + organizationId));
            user.setOrganization(organization);
        }
    }

    private void assignRoles(User user, Set<UUID> roleIds) {
        if (roleIds != null && !roleIds.isEmpty()) {
            Set<Role> roles = roleIds.stream()
                    .map(roleId -> roleRepository.findById(roleId)
                            .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + roleId)))
                    .collect(Collectors.toSet());
            user.setRoles(roles);
        } else {
            user.setRoles(new HashSet<>());
        }
    }
}
