package com.rura.regtech.repository;

import com.rura.regtech.entity.RiskScoreHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RiskScoreHistoryRepository extends JpaRepository<RiskScoreHistory, UUID> {
}
