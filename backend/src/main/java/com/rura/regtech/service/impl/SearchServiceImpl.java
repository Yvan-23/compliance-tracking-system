package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.OrganizationResult;
import com.rura.regtech.dto.response.RegulationResult;
import com.rura.regtech.dto.response.RequirementResult;
import com.rura.regtech.dto.response.SearchResultResponse;
import com.rura.regtech.dto.response.SubmissionResult;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.repository.RegulationRepository;
import com.rura.regtech.repository.ComplianceRequirementRepository;
import com.rura.regtech.repository.SubmissionRepository;
import com.rura.regtech.service.SearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SearchServiceImpl implements SearchService {

    private final OrganizationRepository organizationRepository;
    private final RegulationRepository regulationRepository;
    private final ComplianceRequirementRepository requirementRepository;
    private final SubmissionRepository submissionRepository;

    @Override
    public SearchResultResponse search(String query) {
        String lowerQuery = "%" + query.toLowerCase() + "%";
        
        List<OrganizationResult> organizations = organizationRepository
                .findByNameContainingIgnoreCase(query, PageRequest.of(0, 10))
                .stream()
                .map(org -> OrganizationResult.builder()
                        .id(org.getId())
                        .name(org.getName())
                        .sector(org.getSector())
                        .status(org.getStatus() != null ? org.getStatus().name() : null)
                        .build())
                .collect(Collectors.toList());

        List<RegulationResult> regulations = regulationRepository
                .findByTitleContainingIgnoreCaseAndDeletedFalse(query, PageRequest.of(0, 10))
                .stream()
                .map(reg -> RegulationResult.builder()
                        .id(reg.getId())
                        .title(reg.getTitle())
                        .sector(reg.getSector())
                        .status(reg.getStatus() != null ? reg.getStatus().name() : null)
                        .build())
                .collect(Collectors.toList());

        List<RequirementResult> requirements = requirementRepository
                .findByTitleContainingIgnoreCase(query, PageRequest.of(0, 10))
                .stream()
                .map(req -> RequirementResult.builder()
                        .id(req.getId())
                        .title(req.getTitle())
                        .regulationTitle(req.getRegulation() != null ? req.getRegulation().getTitle() : null)
                        .frequency(req.getFrequency() != null ? req.getFrequency().name() : null)
                        .build())
                .collect(Collectors.toList());

        List<SubmissionResult> submissions = submissionRepository
                .findByComplianceRecord_Organization_NameContainingIgnoreCase(query, PageRequest.of(0, 10))
                .stream()
                .map(sub -> SubmissionResult.builder()
                        .id(sub.getId())
                        .requirementTitle(sub.getComplianceRecord() != null && sub.getComplianceRecord().getRequirement() != null 
                                ? sub.getComplianceRecord().getRequirement().getTitle() : null)
                        .organizationName(sub.getComplianceRecord() != null && sub.getComplianceRecord().getOrganization() != null
                                ? sub.getComplianceRecord().getOrganization().getName() : null)
                        .status(sub.getStatus() != null ? sub.getStatus().name() : null)
                        .submittedAt(sub.getSubmissionDate() != null ? sub.getSubmissionDate().toString() : null)
                        .build())
                .collect(Collectors.toList());

        return SearchResultResponse.builder()
                .organizations(organizations)
                .regulations(regulations)
                .requirements(requirements)
                .submissions(submissions)
                .build();
    }
}