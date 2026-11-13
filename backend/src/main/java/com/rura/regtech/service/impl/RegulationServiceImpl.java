package com.rura.regtech.service.impl;

import com.rura.regtech.dto.request.RegulationRequest;
import com.rura.regtech.dto.response.RegulationResponse;
import com.rura.regtech.entity.Regulation;
import com.rura.regtech.entity.enums.RegulationStatus;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.RegulationRepository;
import com.rura.regtech.service.RegulationService;
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
public class RegulationServiceImpl implements RegulationService {

    private final RegulationRepository regulationRepository;

    @Override
    @Transactional
    public RegulationResponse createRegulation(RegulationRequest request) {
        if (regulationRepository.existsByTitleAndDeletedFalse(request.getTitle())) {
            throw new IllegalArgumentException("Regulation with title " + request.getTitle() + " already exists.");
        }

        Regulation regulation = Regulation.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .sector(request.getSector())
                .effectiveDate(request.getEffectiveDate())
                .version(request.getVersion())
                .status(RegulationStatus.ACTIVE)
                .build();

        Regulation saved = regulationRepository.save(regulation);
        log.info("Created regulation: {}", saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public RegulationResponse getRegulationById(UUID id) {
        Regulation regulation = regulationRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regulation not found: " + id));
        return mapToResponse(regulation);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RegulationResponse> getAllRegulations(Pageable pageable) {
        return regulationRepository.findAllByDeletedFalse(pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional
    public RegulationResponse updateRegulation(UUID id, RegulationRequest request) {
        Regulation regulation = regulationRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regulation not found: " + id));

        regulation.setTitle(request.getTitle());
        regulation.setDescription(request.getDescription());
        regulation.setSector(request.getSector());
        regulation.setEffectiveDate(request.getEffectiveDate());
        regulation.setVersion(request.getVersion());

        Regulation updated = regulationRepository.save(regulation);
        log.info("Updated regulation: {}", updated.getId());
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void updateStatus(UUID id, RegulationStatus status) {
        Regulation regulation = regulationRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regulation not found: " + id));
        regulation.setStatus(status);
        regulationRepository.save(regulation);
        log.info("Updated status for regulation {}: {}", id, status);
    }

    @Override
    @Transactional
    public void deleteRegulation(UUID id) {
        Regulation regulation = regulationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regulation not found: " + id));
        regulation.setDeleted(true);
        regulationRepository.save(regulation); // Soft delete
        log.info("Soft deleted regulation: {}", id);
    }

    private RegulationResponse mapToResponse(Regulation reg) {
        return new RegulationResponse(
                reg.getId(),
                reg.getTitle(),
                reg.getDescription(),
                reg.getSector(),
                reg.getEffectiveDate(),
                reg.getVersion(),
                reg.getStatus() != null ? reg.getStatus() : null);
    }
}
