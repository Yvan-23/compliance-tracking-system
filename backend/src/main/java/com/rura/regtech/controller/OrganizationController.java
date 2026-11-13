package com.rura.regtech.controller;

import com.rura.regtech.dto.request.OrganizationRequest;
import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.dto.response.LocationResponse;
import com.rura.regtech.dto.response.OrganizationResponse;
import com.rura.regtech.entity.enums.OrganizationStatus;
import com.rura.regtech.service.LocationService;
import com.rura.regtech.service.OrganizationService;
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
@RequestMapping("/api/v1/organizations")
@RequiredArgsConstructor
@Slf4j
public class OrganizationController {

    private final OrganizationService organizationService;
    private final LocationService locationService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrganizationResponse>> createOrganization(
            @Valid @RequestBody OrganizationRequest request) {
        log.info("REST request to create Organization");
        OrganizationResponse response = organizationService.createOrganization(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Organization created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrganizationResponse>> getOrganizationById(@PathVariable UUID id) {
        log.info("REST request to get Organization : {}", id);
        OrganizationResponse response = organizationService.getOrganizationById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Organization fetched successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OrganizationResponse>>> getAllOrganizations(
            @PageableDefault(size = 20) Pageable pageable) {
        log.info("REST request to get all Organizations");
        Page<OrganizationResponse> response = organizationService.getAllOrganizations(pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Organizations fetched successfully", response));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<OrganizationResponse>>> searchOrganizations(
            @RequestParam String query,
            @PageableDefault(size = 10) Pageable pageable) {
        log.info("Searching organizations with query: {}", query);
        Page<OrganizationResponse> response = organizationService.searchByName(query, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Search results", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OrganizationResponse>> updateOrganization(@PathVariable UUID id,
            @Valid @RequestBody OrganizationRequest request) {
        log.info("REST request to update Organization : {}", id);
        OrganizationResponse response = organizationService.updateOrganization(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Organization updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(@PathVariable UUID id,
            @RequestParam OrganizationStatus status) {
        log.info("REST request to update Organization status : {}", id);
        organizationService.updateStatus(id, status);
        return ResponseEntity.ok(new ApiResponse<>(true, "Organization status updated successfully", null));
    }

    @GetMapping("/geocode")
    public ResponseEntity<ApiResponse<LocationResponse>> geocodeAddress(@RequestParam String address) {
        log.info("Geocoding address: {}", address);
        LocationResponse response = locationService.geocodeAddressWithFallback(address);
        return ResponseEntity.ok(new ApiResponse<>(true, "Location fetched successfully", response));
    }

    @GetMapping("/geocode/search")
    public ResponseEntity<ApiResponse<java.util.List<LocationResponse>>> geocodeAddressSearch(@RequestParam String address) {
        log.info("Geocoding address (multi-result): {}", address);
        java.util.List<LocationResponse> results = locationService.geocodeAddressMultiple(address);
        return ResponseEntity.ok(new ApiResponse<>(true, "Location results fetched successfully", results));
    }

    @PostMapping("/{id}/refresh-location")
    public ResponseEntity<ApiResponse<OrganizationResponse>> refreshLocation(@PathVariable UUID id) {
        log.info("Refreshing location for organization: {}", id);
        OrganizationResponse org = organizationService.getOrganizationById(id);
        if (org.address() != null && !org.address().isEmpty()) {
            locationService.updateOrganizationLocation(id, org.address());
            org = organizationService.getOrganizationById(id);
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "Location refreshed successfully", org));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteOrganization(@PathVariable UUID id) {
        log.info("REST request to delete Organization: {}", id);
        organizationService.deleteOrganization(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Organization deleted successfully", null));
    }
}
