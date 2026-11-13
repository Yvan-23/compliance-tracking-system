package com.rura.regtech.repository;

import com.rura.regtech.entity.ComplianceRecord;
import com.rura.regtech.entity.enums.ComplianceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ComplianceRecordRepository extends JpaRepository<ComplianceRecord, UUID> {

        List<ComplianceRecord> findByOrganizationId(UUID organizationId);

        org.springframework.data.domain.Page<ComplianceRecord> findByOrganizationId(UUID organizationId,
                        org.springframework.data.domain.Pageable pageable);

        List<ComplianceRecord> findByStatus(ComplianceStatus status);

        List<ComplianceRecord> findByOrganizationIdAndStatus(UUID organizationId, ComplianceStatus status);

        boolean existsByOrganizationIdAndRequirementIdAndReportingPeriodStart(UUID organizationId, UUID requirementId,
                        java.time.LocalDate reportingPeriodStart);

        List<ComplianceRecord> findByStatusAndReportingPeriodEndBefore(ComplianceStatus status,
                        java.time.LocalDate reportingPeriodEnd);

        java.util.Optional<ComplianceRecord> findByOrganizationIdAndRequirementId(UUID organizationId, UUID requirementId);

        @org.springframework.data.jpa.repository.Query("SELECT cr FROM ComplianceRecord cr WHERE cr.organization.id = :tenantId")
        org.springframework.data.domain.Page<ComplianceRecord> findByTenantId(@org.springframework.data.repository.query.Param("tenantId") UUID tenantId,
                        org.springframework.data.domain.Pageable pageable);

        @org.springframework.data.jpa.repository.Query("SELECT cr FROM ComplianceRecord cr WHERE (:tenantId IS NULL OR cr.organization.id = :tenantId)")
        List<ComplianceRecord> findByTenantIdOptional(@org.springframework.data.repository.query.Param("tenantId") UUID tenantId);

        long countByOrganizationId(UUID organizationId);

        @Query("SELECT cr FROM ComplianceRecord cr JOIN FETCH cr.organization o JOIN FETCH cr.requirement r WHERE LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(r.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(CAST(cr.status AS string)) LIKE LOWER(CONCAT('%', :search, '%'))")
        List<ComplianceRecord> searchByKeyword(@Param("search") String search);
}
