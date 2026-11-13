package com.rura.regtech.service;

import com.rura.regtech.dto.request.EvidenceRequest;
import com.rura.regtech.dto.response.EvidenceResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface EvidenceService {
    EvidenceResponse createEvidence(EvidenceRequest request);

    EvidenceResponse createEvidenceWithFile(EvidenceRequest request, MultipartFile file);

    EvidenceResponse runAiExtraction(UUID id);

    EvidenceResponse updateEvidence(UUID id, EvidenceRequest request);

    EvidenceResponse getEvidence(UUID id);

    Page<EvidenceResponse> getEvidenceByOrganization(UUID organizationId, String status, String documentType, String search, Pageable pageable);

    Page<EvidenceResponse> getAllEvidence(String status, String documentType, String search, Pageable pageable);

    List<EvidenceResponse> getExpiringEvidence(UUID organizationId, int daysThreshold);

    List<EvidenceResponse> getExpiredEvidence(UUID organizationId);

    void deleteEvidence(UUID id);

    byte[] downloadEvidenceBytes(UUID id);

    void processExpiryUpdates();

    long countExpiredEvidence(UUID organizationId);

    long countExpiringSoonEvidence(UUID organizationId);

    void reconcileAllEvidence(UUID organizationId);
}
