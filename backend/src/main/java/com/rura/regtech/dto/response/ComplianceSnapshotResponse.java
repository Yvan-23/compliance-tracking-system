package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.RiskLevel;

import java.util.UUID;

public record ComplianceSnapshotResponse(
                UUID organizationId,
                String organizationName,
                double currentComplianceScore,
                RiskLevel riskLevel,
                double riskScore,
                int activeViolations,
                int openInspections,
                int openCorrectiveActions,
                int pendingSubmissions,
                int escalationLevel,
                boolean likelyToFailNextDeadline,
                String predictiveRiskReasoning) {
}
