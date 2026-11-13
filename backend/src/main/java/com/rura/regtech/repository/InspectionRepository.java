package com.rura.regtech.repository;

import com.rura.regtech.entity.Inspection;
import com.rura.regtech.entity.enums.InspectionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InspectionRepository extends JpaRepository<Inspection, UUID> {
    Page<Inspection> findByOrganizationId(UUID organizationId, Pageable pageable);
    
    Page<Inspection> findByInspectorId(UUID inspectorId, Pageable pageable);
    
    Page<Inspection> findByStatus(InspectionStatus status, Pageable pageable);
    
    List<Inspection> findByOrganizationIdAndStatus(UUID organizationId, InspectionStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT i FROM Inspection i WHERE i.organization.id = :tenantId")
    Page<Inspection> findByTenantId(@org.springframework.data.repository.query.Param("tenantId") UUID tenantId, Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Inspection i SET i.inspector = null WHERE i.inspector.id = :userId")
    void nullifyInspectorId(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
