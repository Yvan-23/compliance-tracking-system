package com.rura.regtech.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionResult {
    private UUID id;
    private String requirementTitle;
    private String organizationName;
    private String status;
    private String submittedAt;
}