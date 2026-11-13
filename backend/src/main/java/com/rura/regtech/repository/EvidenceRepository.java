package com.rura.regtech.repository;

import com.rura.regtech.entity.Evidence;
import com.rura.regtech.entity.enums.EvidenceDocumentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface EvidenceRepository extends JpaRepository<Evidence, UUID> {

    Page<Evidence> findByOrganizationId(UUID organizationId, Pageable pageable);

    List<Evidence> findByOrganizationId(UUID organizationId);

    List<Evidence> findByExpiryStatus(Evidence.ExpiryStatus status);

    List<Evidence> findByExpiryDateBetween(LocalDate startDate, LocalDate endDate);

    List<Evidence> findByExpiryDateBeforeAndExpiryStatus(LocalDate date, Evidence.ExpiryStatus status);

    List<Evidence> findByOrganizationIdAndExpiryStatus(UUID organizationId, Evidence.ExpiryStatus status);

    List<Evidence> findByOrganizationIdAndExpiryDateBefore(UUID organizationId, LocalDate date);

    List<Evidence> findByOrganizationIdAndExpiryDateBetween(UUID organizationId, LocalDate startDate, LocalDate endDate);

    List<Evidence> findByDocumentType(EvidenceDocumentType documentType);

    List<Evidence> findByOrganizationIdAndDocumentType(UUID organizationId, EvidenceDocumentType documentType);

    @Query("SELECT e FROM Evidence e WHERE e.expiryDate IS NOT NULL AND e.expiryStatus != 'EXPIRED' ORDER BY e.expiryDate ASC")
    List<Evidence> findExpiringEvidenceOrderedByDate();

    @Query("SELECT e FROM Evidence e WHERE e.organization.id = :orgId AND e.expiryDate IS NOT NULL AND e.expiryStatus != 'EXPIRED' ORDER BY e.expiryDate ASC")
    List<Evidence> findExpiringEvidenceByOrganization(@Param("orgId") UUID organizationId);

    @Query("SELECT COUNT(e) FROM Evidence e WHERE e.expiryStatus = 'EXPIRED'")
    long countExpiredEvidence();

    @Query("SELECT COUNT(e) FROM Evidence e WHERE e.expiryStatus = 'EXPIRING_SOON'")
    long countExpiringSoonEvidence();

    @Query("SELECT COUNT(e) FROM Evidence e WHERE e.organization.id = :orgId AND e.expiryStatus = 'EXPIRED'")
    long countExpiredEvidenceByOrganization(@Param("orgId") UUID organizationId);

    @Query("SELECT COUNT(e) FROM Evidence e WHERE e.organization.id = :orgId AND e.expiryStatus = 'EXPIRING_SOON'")
    long countExpiringSoonEvidenceByOrganization(@Param("orgId") UUID organizationId);

    @Query(value = "SELECT * FROM evidence e WHERE e.organization_id = :orgId AND (CAST(:status AS text) IS NULL OR e.expiry_status = CAST(:status AS text)) AND (CAST(:docType AS text) IS NULL OR e.document_type = CAST(:docType AS text)) AND (CAST(:search AS text) IS NULL OR CAST(e.document_name AS text) ILIKE '%' || CAST(:search AS text) || '%')", nativeQuery = true)
    Page<Evidence> findByOrganizationAndFilters(
            @Param("orgId") UUID organizationId,
            @Param("status") String status,
            @Param("docType") String docType,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = "SELECT * FROM evidence e WHERE (CAST(:status AS text) IS NULL OR e.expiry_status = CAST(:status AS text)) AND (CAST(:docType AS text) IS NULL OR e.document_type = CAST(:docType AS text)) AND (CAST(:search AS text) IS NULL OR CAST(e.document_name AS text) ILIKE '%' || CAST(:search AS text) || '%')", nativeQuery = true)
    Page<Evidence> findAllWithFilters(
            @Param("status") String status,
            @Param("docType") String docType,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT e FROM Evidence e WHERE LOWER(e.extractedText) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Evidence> searchByExtractedText(@Param("keyword") String keyword);

    List<Evidence> findByFileHash(String fileHash);

    @Query("SELECT e FROM Evidence e WHERE LOWER(e.fileHash) LIKE LOWER(CONCAT('%', :hash, '%'))")
    List<Evidence> searchByFileHash(@Param("hash") String hash);

    @Query("SELECT e FROM Evidence e WHERE e.organization.id = :orgId AND e.requirement.id = :reqId")
    List<Evidence> findByOrganizationIdAndRequirementId(@Param("orgId") UUID organizationId, @Param("reqId") UUID requirementId);
}
