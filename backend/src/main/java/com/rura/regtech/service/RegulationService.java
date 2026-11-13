package com.rura.regtech.service;

import com.rura.regtech.dto.request.RegulationRequest;
import com.rura.regtech.dto.response.RegulationResponse;
import com.rura.regtech.entity.enums.RegulationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface RegulationService {
    RegulationResponse createRegulation(RegulationRequest request);

    RegulationResponse getRegulationById(UUID id);

    Page<RegulationResponse> getAllRegulations(Pageable pageable);

    RegulationResponse updateRegulation(UUID id, RegulationRequest request);

    void updateStatus(UUID id, RegulationStatus status);

    void deleteRegulation(UUID id);
}
