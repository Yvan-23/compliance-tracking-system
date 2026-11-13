package com.rura.regtech.service;

import com.rura.regtech.dto.request.UserRequest;
import com.rura.regtech.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface UserService {

    UserResponse createUser(UserRequest request);

    UserResponse getUserById(UUID id);

    UserResponse getUserByEmail(String email);

    UserResponse partialUpdateUserByEmail(String email, com.rura.regtech.dto.request.UserPatchRequest request);

    Page<UserResponse> getAllUsers(Pageable pageable);
    
    Page<UserResponse> getAllUsersByRole(Pageable pageable, String role);
    
    UserResponse updateUser(UUID id, UserRequest request);

    UserResponse partialUpdateUser(UUID id, com.rura.regtech.dto.request.UserPatchRequest request);

    void deleteUser(UUID id);

    UserResponse activateUser(UUID id);

    UserResponse deactivateUser(UUID id);

    UserResponse suspendUser(UUID id, java.time.LocalDate suspendedUntil);

}
