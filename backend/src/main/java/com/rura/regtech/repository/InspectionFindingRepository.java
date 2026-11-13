package com.rura.regtech.repository;

import com.rura.regtech.entity.InspectionFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InspectionFindingRepository extends JpaRepository<InspectionFinding, UUID> {
    List<InspectionFinding> findByInspectionId(UUID inspectionId);

    List<InspectionFinding> findByInspection_Organization_Id(UUID organizationId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE InspectionFinding f SET f.createdBy = null WHERE f.createdBy.id = :userId")
    void nullifyCreatedByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
