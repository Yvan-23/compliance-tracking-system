package com.rura.regtech.service.impl;

import com.rura.regtech.dto.request.ComplianceRequirementRequest;
import com.rura.regtech.dto.response.ComplianceRequirementResponse;
import com.rura.regtech.entity.ComplianceRequirement;
import com.rura.regtech.entity.Regulation;
import com.rura.regtech.entity.enums.Frequency;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.ComplianceRequirementRepository;
import com.rura.regtech.repository.RegulationRepository;
import com.rura.regtech.service.ComplianceRequirementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplianceRequirementServiceImpl implements ComplianceRequirementService {

    private final ComplianceRequirementRepository requirementRepository;
    private final RegulationRepository regulationRepository;

    @Override
    @Transactional
    public ComplianceRequirementResponse createRequirement(ComplianceRequirementRequest request) {
        Regulation regulation = regulationRepository.findById(request.getRegulationId())
                .orElseThrow(() -> new ResourceNotFoundException("Regulation not found: " + request.getRegulationId()));

        Frequency frequency;
        try {
            frequency = Frequency.valueOf(request.getFrequency().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid frequency: " + request.getFrequency());
        }

        ComplianceRequirement requirement = ComplianceRequirement.builder()
                .regulation(regulation)
                .title(request.getTitle())
                .description(request.getDescription())
                .frequency(frequency)
                .severityLevel(request.getSeverityLevel() > 0 ? request.getSeverityLevel() : 1)
                .build();

        ComplianceRequirement saved = requirementRepository.save(requirement);
        log.info("Created compliance requirement: {}", saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ComplianceRequirementResponse getRequirementById(UUID id) {
        ComplianceRequirement requirement = requirementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + id));
        return mapToResponse(requirement);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ComplianceRequirementResponse> getAllRequirements(Pageable pageable) {
        return requirementRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ComplianceRequirementResponse> getRequirementsByRegulation(UUID regulationId, Pageable pageable) {
        return requirementRepository.findByRegulationId(regulationId, pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional
    public ComplianceRequirementResponse updateRequirement(UUID id, ComplianceRequirementRequest request) {
        ComplianceRequirement requirement = requirementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + id));

        Regulation regulation = regulationRepository.findById(request.getRegulationId())
                .orElseThrow(() -> new ResourceNotFoundException("Regulation not found: " + request.getRegulationId()));

        Frequency frequency;
        try {
            frequency = Frequency.valueOf(request.getFrequency().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid frequency: " + request.getFrequency());
        }

        requirement.setRegulation(regulation);
        requirement.setTitle(request.getTitle());
        requirement.setDescription(request.getDescription());
        requirement.setFrequency(frequency);
        requirement.setSeverityLevel(request.getSeverityLevel() > 0 ? request.getSeverityLevel() : 1);

        ComplianceRequirement updated = requirementRepository.save(requirement);
        log.info("Updated compliance requirement: {}", updated.getId());
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void deleteRequirement(UUID id) {
        if (!requirementRepository.existsById(id)) {
            throw new ResourceNotFoundException("Requirement not found: " + id);
        }
        requirementRepository.deleteById(id);
        log.info("Deleted compliance requirement: {}", id);
    }

    private ComplianceRequirementResponse mapToResponse(ComplianceRequirement req) {
        String severity = switch (req.getSeverityLevel()) {
            case 1 -> "LOW";
            case 2 -> "MEDIUM";
            case 3 -> "HIGH";
            case 4 -> "CRITICAL";
            default -> "LOW";
        };
        return new ComplianceRequirementResponse(
                req.getId(),
                req.getRegulation() != null ? req.getRegulation().getId() : null,
                req.getRegulation() != null ? req.getRegulation().getTitle() : null,
                req.getRegulation() != null ? req.getRegulation().getSector() : null,
                req.getTitle(),
                req.getDescription(),
                req.getFrequency() != null ? req.getFrequency() : Frequency.ONE_TIME,
                severity,
                req.getSeverityLevel(),
                req.getCreatedAt(),
                req.getUpdatedAt()
        );
    }
}
