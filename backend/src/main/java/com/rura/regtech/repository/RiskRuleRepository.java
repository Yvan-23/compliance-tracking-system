package com.rura.regtech.repository;

import com.rura.regtech.entity.RiskRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RiskRuleRepository extends JpaRepository<RiskRule, UUID> {
    Optional<RiskRule> findByRuleName(String ruleName);

    List<RiskRule> findByActiveTrue();
}
