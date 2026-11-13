package com.rura.regtech.repository;

import com.rura.regtech.entity.ComplianceRequirement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ComplianceRequirementRepository extends JpaRepository<ComplianceRequirement, UUID> {
    List<ComplianceRequirement> findByRegulationSector(String sector);

    Page<ComplianceRequirement> findByRegulationId(UUID regulationId, Pageable pageable);

    Page<ComplianceRequirement> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    List<ComplianceRequirement> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String title, String description);
}
