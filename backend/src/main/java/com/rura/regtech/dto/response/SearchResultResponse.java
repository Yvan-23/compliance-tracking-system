package com.rura.regtech.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultResponse {
    private List<OrganizationResult> organizations;
    private List<RequirementResult> requirements;
    private List<SubmissionResult> submissions;
    private List<RegulationResult> regulations;
}