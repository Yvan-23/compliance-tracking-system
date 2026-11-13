package com.rura.regtech.dto.response;

import lombok.Data;
import java.util.List;

@Data
public class DashboardStatsResponse {
    private long totalRequirements;
    private long complianceRate;
    private long totalOrganizations;
    private long pendingSubmissions;
    private long activeAlerts;
    private long unreadNotifications;
    private long upcomingDeadlines;
    private long totalInspections;
    private long completedInspections;
    private long pendingInspections;
    private long pendingReviews;
}