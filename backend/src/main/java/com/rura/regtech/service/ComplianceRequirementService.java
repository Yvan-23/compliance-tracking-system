package com.rura.regtech.service;

import com.rura.regtech.dto.request.ComplianceRequirementRequest;
import com.rura.regtech.dto.response.ComplianceRequirementResponse;
import com.rura.regtech.service.impl.ComplianceRequirementServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ComplianceRequirementService {
    ComplianceRequirementResponse createRequirement(ComplianceRequirementRequest request);

    ComplianceRequirementResponse getRequirementById(UUID id);

    Page<ComplianceRequirementResponse> getAllRequirements(Pageable pageable);

    Page<ComplianceRequirementResponse> getRequirementsByRegulation(UUID regulationId, Pageable pageable);

    ComplianceRequirementResponse updateRequirement(UUID id, ComplianceRequirementRequest request);

    void deleteRequirement(UUID id);
}
