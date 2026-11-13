package com.rura.regtech.repository;

import com.rura.regtech.entity.Submission;
import com.rura.regtech.entity.enums.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    List<Submission> findByComplianceRecordId(UUID complianceRecordId);

    @Query("SELECT s FROM Submission s LEFT JOIN FETCH s.complianceRecord cr LEFT JOIN FETCH cr.requirement LEFT JOIN FETCH cr.organization LEFT JOIN FETCH s.submittedBy")
    org.springframework.data.domain.Page<Submission> findAllWithDetails(org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Submission> findByComplianceRecordId(UUID complianceRecordId, org.springframework.data.domain.Pageable pageable);

    List<Submission> findByStatus(SubmissionStatus status);

    org.springframework.data.domain.Page<Submission> findByComplianceRecord_Organization_NameContainingIgnoreCase(
            String organizationName, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT s FROM Submission s WHERE LOWER(s.extractedText) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Submission> searchByExtractedText(@Param("keyword") String keyword);

    List<Submission> findByFileHash(String fileHash);

    @Query("SELECT s FROM Submission s WHERE LOWER(s.fileHash) LIKE LOWER(CONCAT('%', :hash, '%'))")
    List<Submission> searchByFileHash(@Param("hash") String hash);

    @Query("SELECT s FROM Submission s JOIN s.complianceRecord cr WHERE cr.organization.id = :tenantId")
    org.springframework.data.domain.Page<Submission> findByTenantId(@Param("tenantId") UUID tenantId,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Submission s SET s.submittedBy = null WHERE s.submittedBy.id = :userId")
    void nullifySubmittedByUserId(@Param("userId") UUID userId);
}
