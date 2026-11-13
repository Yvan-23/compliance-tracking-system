package com.rura.regtech.controller;

import com.rura.regtech.dto.request.UserRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.UserResponse;
import com.rura.regtech.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody UserRequest request) {
        log.info("REST request to create User");
        UserResponse response = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "User created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
        log.info("REST request to get User : {}", id);
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "User fetched successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String role) {
        log.info("REST request to get all Users with role filter: {}", role);
        Page<UserResponse> response = userService.getAllUsersByRole(pageable, role);
        return ResponseEntity.ok(new ApiResponse<>(true, "Users fetched successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(@PathVariable UUID id,
            @Valid @RequestBody UserRequest request) {
        log.info("REST request to update User : {}", id);
        UserResponse response = userService.updateUser(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "User updated successfully", response));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> partialUpdateUser(@PathVariable UUID id,
            @Valid @RequestBody com.rura.regtech.dto.request.UserPatchRequest request) {
        log.info("REST request to partially update User : {}", id);
        UserResponse response = userService.partialUpdateUser(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "User updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID id) {
        log.info("REST request to delete User : {}", id);
        userService.deleteUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "User deleted successfully", null));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<UserResponse>> activateUser(@PathVariable UUID id) {
        log.info("REST request to activate User : {}", id);
        UserResponse response = userService.activateUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "User activated successfully", response));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<UserResponse>> deactivateUser(@PathVariable UUID id) {
        log.info("REST request to deactivate User : {}", id);
        UserResponse response = userService.deactivateUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "User deactivated successfully", response));
    }

    @PatchMapping("/{id}/suspend")
    public ResponseEntity<ApiResponse<UserResponse>> suspendUser(@PathVariable UUID id,
            @RequestBody java.time.LocalDate suspendedUntil) {
        log.info("REST request to suspend User : {} until {}", id, suspendedUntil);
        UserResponse response = userService.suspendUser(id, suspendedUntil);
        return ResponseEntity.ok(new ApiResponse<>(true, "User suspended successfully", response));
    }
}
