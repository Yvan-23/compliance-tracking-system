package com.rura.regtech.controller;

import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.RoleResponse;
import com.rura.regtech.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@Slf4j
public class RoleController {

    private final RoleRepository roleRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        log.info("REST request to get all Roles");
        List<RoleResponse> roles = roleRepository.findAll().stream()
                .map(r -> new RoleResponse(r.getId(), r.getName().name()))
                .toList();
        return ResponseEntity.ok(new ApiResponse<>(true, "Roles fetched successfully", roles));
    }
}
