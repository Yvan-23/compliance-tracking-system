package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.FindingStatus;
import com.rura.regtech.entity.enums.Severity;
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
public class InspectionFindingResponse {
    private UUID id;
    private UUID inspectionId;
    private String description;
    private Severity severity;
    private FindingStatus status;
    private UUID createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID requirementId;
    private String requirementTitle;
}
