package com.rura.regtech.service;

import com.rura.regtech.dto.request.InspectionRequest;
import com.rura.regtech.dto.request.InspectionFindingRequest;
import com.rura.regtech.dto.response.InspectionResponse;
import com.rura.regtech.dto.response.InspectionFindingResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface InspectionService {
    
    InspectionFindingResponse addFinding(UUID inspectionId, InspectionFindingRequest request);

    java.util.List<InspectionFindingResponse> getFindingsByInspectionId(UUID inspectionId);

    InspectionResponse createInspection(InspectionRequest request);
    
    InspectionResponse getInspectionById(UUID id);
    
    Page<InspectionResponse> getAllInspections(Pageable pageable);
    
    Page<InspectionResponse> getInspectionsByOrganization(UUID organizationId, Pageable pageable);
    
    Page<InspectionResponse> getInspectionsByInspector(UUID inspectorId, Pageable pageable);
    
    InspectionResponse updateInspection(UUID id, InspectionRequest request);
    
    void deleteInspection(UUID id);
    
    InspectionResponse updateInspectionStatus(UUID id, String status);
    
    InspectionResponse assignInspector(UUID inspectionId, UUID inspectorId);
    
    String generateAIAnalysis(UUID inspectionId);
    
    String generateInspectionReport(UUID inspectionId);
}
