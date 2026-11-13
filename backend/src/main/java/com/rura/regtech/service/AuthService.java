package com.rura.regtech.service;

import com.rura.regtech.dto.request.LoginRequest;
import com.rura.regtech.dto.request.RegisterRequest;
import com.rura.regtech.dto.response.AuthResponse;

public interface AuthService {
    /**
     * Register a new user
     * 
     * @param request registration details
     * @return authentication response with tokens
     */
    AuthResponse register(RegisterRequest request);

    /**
     * Authenticate user and generate tokens
     * 
     * @param request login credentials
     * @return authentication response with tokens
     */
    AuthResponse login(LoginRequest request);

    /**
     * Refresh access token using refresh token
     * 
     * @param refreshToken the refresh token
     * @return new authentication response with tokens
     */
    AuthResponse refreshToken(String refreshToken);

    void requestPasswordReset(String email);

    boolean verifyOtp(String email, String otp);

    void resetPassword(String email, String otp, String newPassword);
}
