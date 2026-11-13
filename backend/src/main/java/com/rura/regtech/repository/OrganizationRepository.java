package com.rura.regtech.repository;

import com.rura.regtech.entity.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    Optional<Organization> findByRegistrationNumber(String registrationNumber);

    boolean existsByRegistrationNumber(String registrationNumber);

    Page<Organization> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Query("SELECT o FROM Organization o WHERE LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(o.sector) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(o.registrationNumber) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Organization> searchByKeyword(@Param("search") String search);
}
