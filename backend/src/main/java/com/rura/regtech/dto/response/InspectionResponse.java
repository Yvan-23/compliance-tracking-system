package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.InspectionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionResponse {

    private UUID id;
    
    private UUID organizationId;
    
    private String organizationName;
    
    private UUID inspectorId;
    
    private String inspectorName;
    
    private LocalDateTime scheduledDate;
    
    private InspectionStatus status;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
}
