
package com.rura.regtech.service.impl;

import com.rura.regtech.dto.request.LoginRequest;
import com.rura.regtech.dto.request.RegisterRequest;
import com.rura.regtech.dto.response.AuthResponse;
import com.rura.regtech.dto.response.UserResponse;
import com.rura.regtech.entity.PasswordReset;
import com.rura.regtech.entity.Role;
import com.rura.regtech.entity.User;
import com.rura.regtech.entity.enums.RoleName;
import com.rura.regtech.entity.enums.UserStatus;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.repository.PasswordResetRepository;
import com.rura.regtech.repository.RoleRepository;
import com.rura.regtech.repository.UserRepository;
import com.rura.regtech.security.JwtTokenProvider;
import com.rura.regtech.service.AuthService;
import com.rura.regtech.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final com.rura.regtech.service.EventPublisher eventPublisher;
    private final EmailService emailService;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpirationMs;

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {

        // Check if user already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        // Create new user
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .status(UserStatus.ACTIVE)
                .build();

        // Set organization if provided
        if (request.getOrganizationId() != null) {
            user.setOrganization(
                    organizationRepository.findById(request.getOrganizationId())
                            .orElseThrow(() ->
                                    new ResourceNotFoundException("Organization not found"))
            );
        }

        // Assign roles
        Set<Role> roles = new HashSet<>();

        if (request.getRoles() != null && !request.getRoles().isEmpty()) {

            for (String roleName : request.getRoles()) {
                try {
                    RoleName roleNameEnum =
                            RoleName.valueOf(roleName.toUpperCase());

                    Role role = roleRepository.findByName(roleNameEnum)
                            .orElse(null);

                    if (role == null) {
                        log.warn("Role {} not found in database, skipping",
                                roleNameEnum);
                        continue;
                    }

                    roles.add(role);

                } catch (IllegalArgumentException e) {
                    log.warn("Invalid role name: {}", roleName);
                }
            }

        } else {

            // Default role: AUDITOR
            RoleName defaultRole = RoleName.AUDITOR;

            Role userRole = roleRepository.findByName(defaultRole)
                    .orElse(null);

            if (userRole != null) {
                roles.add(userRole);
            }
        }

        if (roles.isEmpty()) {
            throw new IllegalArgumentException(
                    "No valid roles available. Please contact administrator."
            );
        }

        user.setRoles(roles);

        // Save user
        user = userRepository.save(user);

        log.info("New user registered: {}", user.getEmail());

        // Publish user created event
        try {
            java.util.Map<String, Object> payload =
                    new java.util.HashMap<>();

            payload.put("fullName", user.getFullName());
            payload.put("email", user.getEmail());

            payload.put("role", user.getRoles().stream()
                    .map(role -> role.getName().name())
                    .collect(Collectors.joining(",")));

            eventPublisher.publishAuditEvent(
                    com.rura.regtech.event.EventType.USER_CREATED,
                    "USER",
                    user.getId(),
                    user.getId(),
                    user.getOrganization() != null
                            ? user.getOrganization().getId() : null,
                    "CREATE",
                    payload
            );

        } catch (Exception e) {
            log.error("Failed to publish USER_CREATED event", e);
        }

        // Generate tokens
        UserDetails userDetails =
                userDetailsService.loadUserByUsername(user.getEmail());

        String tenantId = user.getOrganization() != null
                ? user.getOrganization().getId().toString()
                : null;

        String accessToken = tokenProvider.generateTokenWithTenant(
                user.getEmail(),
                user.getRoles().stream()
                        .map(role -> role.getName().name())
                        .collect(Collectors.toList()),
                tenantId,
                user.getFullName()
        );

        String refreshToken =
                tokenProvider.generateRefreshToken(userDetails);

        // Build response
        return new AuthResponse(
                accessToken,
                refreshToken,
                "Bearer",
                jwtExpirationMs,
                mapToUserResponse(user)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {

        try {
            Authentication authentication =
                    authenticationManager.authenticate(
                            new UsernamePasswordAuthenticationToken(
                                    request.getEmail(),
                                    request.getPassword()
                            )
                    );

            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() ->
                            new ResourceNotFoundException("User not found"));

            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new BadCredentialsException(
                        "User account is not active");
            }

            UserDetails userDetails =
                    (UserDetails) authentication.getPrincipal();

            String tenantId = user.getOrganization() != null
                    ? user.getOrganization().getId().toString()
                    : null;

            String accessToken = tokenProvider.generateTokenWithTenant(
                    user.getEmail(),
                    user.getRoles().stream()
                            .map(role -> role.getName().name())
                            .collect(Collectors.toList()),
                    tenantId,
                    user.getFullName()
            );

            String refreshToken =
                    tokenProvider.generateRefreshToken(userDetails);

            log.info("User logged in successfully: {}", user.getEmail());

            try {
                java.util.Map<String, Object> payload =
                        new java.util.HashMap<>();

                payload.put("email", user.getEmail());
                payload.put("ipAddress", "unknown");

                eventPublisher.publishAuditEvent(
                        com.rura.regtech.event.EventType.USER_LOGIN,
                        "USER",
                        user.getId(),
                        user.getId(),
                        user.getOrganization() != null
                                ? user.getOrganization().getId() : null,
                        "LOGIN",
                        payload
                );

            } catch (Exception e) {
                log.error("Failed to publish USER_LOGIN event", e);
            }

            return new AuthResponse(
                    accessToken,
                    refreshToken,
                    "Bearer",
                    jwtExpirationMs,
                    mapToUserResponse(user)
            );

        } catch (BadCredentialsException e) {
            log.error("Invalid login attempt for user: {}",
                    request.getEmail());

            throw new BadCredentialsException(
                    "Invalid email or password");
        }
    }

    @Override
    public AuthResponse refreshToken(String refreshToken) {

        // Validate refresh token
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadCredentialsException(
                    "Invalid or expired refresh token");
        }

        // Extract username from token
        String username = tokenProvider.extractUsername(refreshToken);

        // Load user details
        UserDetails userDetails =
                userDetailsService.loadUserByUsername(username);

        User user = userRepository.findByEmail(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        // Generate new tokens
        String tenantId = user.getOrganization() != null
                ? user.getOrganization().getId().toString()
                : null;

        String newAccessToken = tokenProvider.generateTokenWithTenant(
                username,
                user.getRoles().stream()
                        .map(role -> role.getName().name())
                        .collect(Collectors.toList()),
                tenantId,
                user.getFullName()
        );

        String newRefreshToken =
                tokenProvider.generateRefreshToken(userDetails);

        log.info("Token refreshed for user: {}", username);

        // Build response
        return new AuthResponse(
                newAccessToken,
                newRefreshToken,
                "Bearer",
                jwtExpirationMs,
                mapToUserResponse(user)
        );
    }

    private UserResponse mapToUserResponse(User user) {

        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getStatus(),
                user.getOrganization() != null
                        ? user.getOrganization().getId() : null,
                user.getOrganization() != null
                        ? user.getOrganization().getName() : null,
                user.getRoles().stream()
                        .map(role -> role.getName().name())
                        .collect(Collectors.toSet()),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    // ==========================================
    // PASSWORD RESET - UPDATED METHOD
    // ==========================================

    @Override
    @Transactional
    public void requestPasswordReset(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found with email: " + email
                        ));

        // Generate 6-digit OTP
        String otp = String.format(
                "%06d",
                secureRandom.nextInt(1_000_000)
        );

        // Delete ALL existing password reset records for this email.
        // This includes both used and unused OTP records.
        passwordResetRepository.deleteByEmail(email);

        // Create a new password reset record
        PasswordReset passwordReset = PasswordReset.builder()
                .email(email)
                .otp(otp)
                .used(false)
                .build();

        // Save the new record
        passwordResetRepository.save(passwordReset);

        // Send OTP email
        emailService.sendOtpEmail(email, otp);

        log.info("Password reset OTP generated for: {}", email);
    }

    @Override
    public boolean verifyOtp(String email, String otp) {

        PasswordReset passwordReset = passwordResetRepository
                .findByEmailAndOtpAndUsedFalse(email, otp)
                .orElse(null);

        if (passwordReset == null) {
            log.warn("Invalid OTP attempt for: {}", email);
            return false;
        }

        // Check if OTP has expired
        if (LocalDateTime.now().isAfter(passwordReset.getExpiresAt())) {
            log.warn("Expired OTP attempt for: {}", email);
            return false;
        }

        return true;
    }

    @Override
    @Transactional
    public void resetPassword(
            String email,
            String otp,
            String newPassword
    ) {

        PasswordReset passwordReset = passwordResetRepository
                .findByEmailAndOtpAndUsedFalse(email, otp)
                .orElseThrow(() ->
                        new BadCredentialsException(
                                "Invalid or expired OTP"));

        // Check if OTP has expired
        if (LocalDateTime.now().isAfter(passwordReset.getExpiresAt())) {
            throw new BadCredentialsException("OTP has expired");
        }

        // Find and update user password
        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark OTP as used
        passwordReset.setUsed(true);
        passwordResetRepository.save(passwordReset);

        // Send confirmation email
        emailService.sendPasswordChangedNotification(email);

        log.info("Password reset completed for: {}", email);
    }
}
