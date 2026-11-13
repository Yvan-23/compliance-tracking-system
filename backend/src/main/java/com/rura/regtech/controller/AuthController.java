package com.rura.regtech.controller;

import com.rura.regtech.dto.request.ForgotPasswordRequest;
import com.rura.regtech.dto.request.LoginRequest;
import com.rura.regtech.dto.request.RegisterRequest;
import com.rura.regtech.dto.request.ResetPasswordRequest;
import com.rura.regtech.dto.request.VerifyOtpRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.AuthResponse;
import com.rura.regtech.service.AuthService;
import com.rura.regtech.security.RateLimited;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @RateLimited(requests = 5)
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration attempt for user: {}", request.getEmail());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "User registered successfully", response));
    }

    @RateLimited(requests = 5)
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login attempt for user: {}", request.getEmail());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Login successful", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@RequestHeader("Authorization") String refreshToken) {
        log.info("Token refresh request");

        // Extract token from "Bearer <token>"
        String token = refreshToken.substring(7);
        AuthResponse response = authService.refreshToken(token);

        return ResponseEntity.ok(new ApiResponse<>(true, "Token refreshed successfully", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        log.info("Logout request");
        // In stateless JWT, logout is client-side (remove token)
        // For enhanced security, implement token blacklist
        return ResponseEntity.ok(new ApiResponse<>(true, "Logout successful", null));
    }

    @RateLimited(requests = 3)
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("Forgot password request for email: {}", request.getEmail());
        authService.requestPasswordReset(request.getEmail());
        return ResponseEntity.ok(new ApiResponse<>(true, "OTP sent to your email", null));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Boolean>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        log.info("Verify OTP request for email: {}", request.getEmail());
        boolean valid = authService.verifyOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(new ApiResponse<>(valid, valid ? "OTP is valid" : "Invalid or expired OTP", valid));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("Reset password request for email: {}", request.getEmail());
        authService.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
        return ResponseEntity.ok(new ApiResponse<>(true, "Password reset successfully", null));
    }
}
