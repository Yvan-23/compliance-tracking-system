package com.rura.regtech.service;

import com.rura.regtech.dto.request.OrganizationRequest;
import com.rura.regtech.dto.response.OrganizationResponse;
import com.rura.regtech.entity.enums.OrganizationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface OrganizationService {
    OrganizationResponse createOrganization(OrganizationRequest request);

    OrganizationResponse getOrganizationById(UUID id);

    Page<OrganizationResponse> getAllOrganizations(Pageable pageable);

    Page<OrganizationResponse> searchByName(String query, Pageable pageable);

    OrganizationResponse updateOrganization(UUID id, OrganizationRequest request);

    void updateStatus(UUID id, OrganizationStatus status);

    void deleteOrganization(UUID id);
}
