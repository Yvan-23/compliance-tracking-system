package com.rura.regtech.repository;

import com.rura.regtech.entity.ComplianceSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ComplianceSnapshotRepository extends JpaRepository<ComplianceSnapshot, UUID> {
}
