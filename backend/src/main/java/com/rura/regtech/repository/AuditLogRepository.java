package com.rura.regtech.repository;

import com.rura.regtech.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:search = '' OR LOWER(a.action) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(a.entityType) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(a.details) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR (a.user IS NOT NULL AND LOWER(a.user.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "OR (a.user IS NOT NULL AND LOWER(a.user.fullName) LIKE LOWER(CONCAT('%', :search, '%')))) " +
           "AND (:action = '' OR a.action = :action) " +
           "AND (:entityType = '' OR a.entityType = :entityType) " +
           "AND (:startDate IS NULL OR a.timestamp >= :startDate) " +
           "AND (:endDate IS NULL OR a.timestamp <= :endDate) " +
           "ORDER BY a.timestamp DESC")
    Page<AuditLog> searchLogs(@Param("search") String search,
                              @Param("action") String action,
                              @Param("entityType") String entityType,
                              @Param("startDate") LocalDateTime startDate,
                              @Param("endDate") LocalDateTime endDate,
                              Pageable pageable);

    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE AuditLog a SET a.user = null WHERE a.user.id = :userId")
    void nullifyUserByUserId(@Param("userId") UUID userId);
}
