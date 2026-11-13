package com.rura.regtech.controller;

import com.rura.regtech.dto.request.UserPatchRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.UserResponse;
import com.rura.regtech.service.UserService;
import com.rura.regtech.config.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
@Slf4j
public class ProfileController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<UserResponse>> getProfile() {
        String email = SecurityUtils.getCurrentUserEmail();
        log.info("REST request to get profile for user: {}", email);
        UserResponse response = userService.getUserByEmail(email);
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile fetched successfully", response));
    }

    @PatchMapping
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(@Valid @RequestBody UserPatchRequest request) {
        String email = SecurityUtils.getCurrentUserEmail();
        log.info("REST request to update profile for user: {}", email);
        UserResponse response = userService.partialUpdateUserByEmail(email, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile updated successfully", response));
    }
}
