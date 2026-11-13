package com.rura.regtech.service.impl;

import com.rura.regtech.dto.request.OrganizationRequest;
import com.rura.regtech.dto.response.LocationResponse;
import com.rura.regtech.dto.response.OrganizationResponse;
import com.rura.regtech.entity.Organization;
import com.rura.regtech.entity.enums.OrganizationStatus;
import com.rura.regtech.entity.enums.OrganizationType;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.service.AuditLogService;
import com.rura.regtech.service.LocationService;
import com.rura.regtech.service.OrganizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final LocationService locationService;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public OrganizationResponse createOrganization(OrganizationRequest request) {
        if (organizationRepository.existsByRegistrationNumber(request.getRegistrationNumber())) {
            throw new IllegalArgumentException(
                    "Organization with registration number " + request.getRegistrationNumber() + " already exists.");
        }

        Organization organization = Organization.builder()
                .name(request.getName())
                .type(OrganizationType.valueOf(request.getType().toUpperCase()))
                .sector(request.getSector())
                .registrationNumber(request.getRegistrationNumber())
                .address(request.getAddress())
                .status(OrganizationStatus.PENDING_APPROVAL)
                .build();

        // Use coordinates provided by frontend (already picked from geocode dropdown)
        if (request.getLatitude() != null && request.getLongitude() != null) {
            organization.setLatitude(request.getLatitude());
            organization.setLongitude(request.getLongitude());
            organization.setLocationSource(request.getLocationSource() != null ? request.getLocationSource() : "OpenStreetMap/Nominatim");
        } else if (request.getAddress() != null && !request.getAddress().isEmpty()) {
            // Fallback: try to geocode the raw address string
            try {
                LocationResponse location = locationService.geocodeAddressWithFallback(request.getAddress());
                if (location.isSuccess()) {
                    organization.setLatitude(location.getLatitude());
                    organization.setLongitude(location.getLongitude());
                    organization.setLocationSource(location.getSource());
                } else {
                    log.warn("Could not geocode address for new organization: {}", location.getErrorMessage());
                }
            } catch (Exception e) {
                log.error("Error geocoding address for new organization: {}", e.getMessage());
            }
        }

        Organization saved = organizationRepository.save(organization);
        log.info("Created organization: {}", saved.getId());

        auditLogService.log("CREATE", "ORGANIZATION", saved.getId(),
                "Created organization: " + saved.getName() + " (" + saved.getSector() + ")");
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public OrganizationResponse getOrganizationById(UUID id) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));
        return mapToResponse(organization);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrganizationResponse> getAllOrganizations(Pageable pageable) {
        return organizationRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional
    public OrganizationResponse updateOrganization(UUID id, OrganizationRequest request) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));

        organization.setName(request.getName());
        organization.setType(OrganizationType.valueOf(request.getType().toUpperCase()));
        organization.setSector(request.getSector());
        organization.setRegistrationNumber(request.getRegistrationNumber());
        organization.setAddress(request.getAddress());

        // Use coordinates provided by frontend (already picked from geocode dropdown)
        if (request.getLatitude() != null && request.getLongitude() != null) {
            organization.setLatitude(request.getLatitude());
            organization.setLongitude(request.getLongitude());
            organization.setLocationSource(request.getLocationSource() != null ? request.getLocationSource() : "OpenStreetMap/Nominatim");
        } else if (request.getAddress() != null && !request.getAddress().isEmpty()) {
            try {
                LocationResponse location = locationService.geocodeAddressWithFallback(request.getAddress());
                if (location.isSuccess()) {
                    organization.setLatitude(location.getLatitude());
                    organization.setLongitude(location.getLongitude());
                    organization.setLocationSource(location.getSource());
                } else {
                    log.warn("Could not geocode updated address: {}", location.getErrorMessage());
                }
            } catch (Exception e) {
                log.error("Error geocoding updated address: {}", e.getMessage());
            }
        }

        Organization updated = organizationRepository.save(organization);
        log.info("Updated organization: {}", updated.getId());
        auditLogService.log("UPDATE", "ORGANIZATION", updated.getId(),
                "Updated organization: " + updated.getName());
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void updateStatus(UUID id, OrganizationStatus status) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));
        OrganizationStatus oldStatus = organization.getStatus();
        organization.setStatus(status);
        organizationRepository.save(organization);
        log.info("Updated status for organization {}: {} -> {}", id, oldStatus, status);
        auditLogService.log("STATUS_CHANGE", "ORGANIZATION", id,
                "Organization '" + organization.getName() + "' status changed: " + oldStatus + " -> " + status);
    }

    @Override
    public void deleteOrganization(UUID id) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));
        String name = organization.getName();
        organizationRepository.deleteById(id);
        log.info("Deleted organization: {}", id);
        auditLogService.log("DELETE", "ORGANIZATION", id, "Organization '" + name + "' deleted");
    }

    @Override
    public Page<OrganizationResponse> searchByName(String query, Pageable pageable) {
        Page<Organization> orgs = organizationRepository.findByNameContainingIgnoreCase(query, pageable);
        return orgs.map(this::mapToResponse);
    }

    private OrganizationResponse mapToResponse(Organization org) {
        return new OrganizationResponse(
                org.getId(),
                org.getName(),
                org.getType(),
                org.getSector(),
                org.getRegistrationNumber(),
                org.getAddress(),
                org.getLatitude(),
                org.getLongitude(),
                org.getLocationSource(),
                org.getStatus(),
                org.getRiskScore(),
                org.getRiskLevel(),
                org.getCreatedAt(),
                org.getUpdatedAt());
    }
}
