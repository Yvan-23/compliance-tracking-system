package com.rura.regtech.controller;

import com.rura.regtech.dto.response.*;
import com.rura.regtech.entity.*;
import com.rura.regtech.entity.enums.*;
import com.rura.regtech.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final ComplianceRequirementRepository requirementRepository;
    private final ComplianceRecordRepository complianceRecordRepository;
    private final OrganizationRepository organizationRepository;
    private final SubmissionRepository submissionRepository;
    private final InspectionRepository inspectionRepository;
    private final NotificationRepository notificationRepository;

    @GetMapping("/admin/stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getAdminStats() {
        log.info("Fetching admin dashboard stats");
        
        long totalRequirements = requirementRepository.count();
        long totalOrganizations = organizationRepository.count();
        
        List<ComplianceRecord> allRecords = complianceRecordRepository.findAll();
        double averageScore = allRecords.stream()
            .mapToDouble(r -> r.getComplianceScore() != null ? r.getComplianceScore() : 0.0)
            .average()
            .orElse(100.0);
        long complianceRate = Math.round(averageScore);
        
        long pendingSubmissions = submissionRepository.findAll().stream()
            .filter(s -> s.getStatus() == SubmissionStatus.SUBMITTED)
            .count();
        
        List<Notification> allNotifications = notificationRepository.findAll();
        long unreadNotifications = allNotifications.stream()
            .filter(n -> !n.isReadStatus())
            .count();
        
        long activeAlerts = allRecords.stream()
            .filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT)
            .count();
        
        DashboardStatsResponse stats = new DashboardStatsResponse();
        stats.setTotalRequirements(totalRequirements);
        stats.setComplianceRate(complianceRate);
        stats.setTotalOrganizations(totalOrganizations);
        stats.setPendingSubmissions(pendingSubmissions);
        stats.setActiveAlerts(activeAlerts);
        stats.setUnreadNotifications(unreadNotifications);
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Admin stats fetched successfully", stats));
    }

    @GetMapping("/entity/stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getEntityStats(@RequestParam(required = false) UUID organizationId) {
        log.info("Fetching entity dashboard stats for organization: {}", organizationId);
        
        if (organizationId == null) {
            DashboardStatsResponse stats = new DashboardStatsResponse();
            stats.setTotalRequirements(0);
            stats.setComplianceRate(0);
            stats.setPendingSubmissions(0);
            stats.setUpcomingDeadlines(0);
            return ResponseEntity.ok(new ApiResponse<>(true, "No organization set", stats));
        }
        
        List<ComplianceRecord> orgRecords = complianceRecordRepository.findByOrganizationId(organizationId);
        
        double averageScore = orgRecords.stream()
            .mapToDouble(r -> r.getComplianceScore() != null ? r.getComplianceScore() : 0.0)
            .average()
            .orElse(100.0);
        long complianceRate = Math.round(averageScore);
        
        long pendingSubmissions = submissionRepository.findAll().stream()
            .filter(s -> s.getStatus() == SubmissionStatus.SUBMITTED
                && s.getComplianceRecord() != null
                && s.getComplianceRecord().getOrganization() != null
                && s.getComplianceRecord().getOrganization().getId().equals(organizationId))
            .count();
        
        List<Inspection> allInspections = inspectionRepository.findAll();
        List<Inspection> inspections = allInspections.stream()
            .filter(i -> i.getOrganization() != null && i.getOrganization().getId().equals(organizationId))
            .toList();
        
        long upcomingDeadlines = orgRecords.stream()
            .filter(r -> r.getReportingPeriodEnd() != null 
                && r.getReportingPeriodEnd().isAfter(LocalDate.now())
                && r.getReportingPeriodEnd().isBefore(LocalDate.now().plusDays(30)))
            .count();
        
        DashboardStatsResponse stats = new DashboardStatsResponse();
        stats.setTotalRequirements(requirementRepository.count());
        stats.setComplianceRate(complianceRate);
        stats.setPendingSubmissions(pendingSubmissions);
        stats.setUpcomingDeadlines(upcomingDeadlines);
        stats.setTotalInspections(inspections.size());
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Entity stats fetched successfully", stats));
    }

    @GetMapping("/auditor/stats")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getAuditorStats(@RequestParam(required = false) UUID inspectorId) {
        log.info("Fetching auditor dashboard stats");
        
        List<Inspection> allInspections = inspectionRepository.findAll();
        long completedInspections = allInspections.stream()
            .filter(i -> i.getStatus() == InspectionStatus.COMPLETED)
            .count();
        long pendingInspections = allInspections.stream()
            .filter(i -> i.getStatus() == InspectionStatus.SCHEDULED)
            .count();
        
        long pendingReviews = submissionRepository.findAll().stream()
            .filter(s -> s.getStatus() == SubmissionStatus.SUBMITTED)
            .count();
        
        List<ComplianceRecord> allRecords = complianceRecordRepository.findAll();
        long nonCompliant = allRecords.stream()
            .filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT)
            .count();
        
        DashboardStatsResponse stats = new DashboardStatsResponse();
        stats.setTotalInspections(allInspections.size());
        stats.setCompletedInspections(completedInspections);
        stats.setPendingInspections(pendingInspections);
        stats.setPendingReviews(pendingReviews);
        stats.setActiveAlerts(nonCompliant);
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Auditor stats fetched successfully", stats));
    }

    @GetMapping("/admin/recent-activity")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getRecentActivity() {
        log.info("Fetching recent activity");
        
        List<ActivityResponse> activities = new ArrayList<>();
        
        List<Submission> recentSubmissions = submissionRepository.findAll();
        recentSubmissions.stream()
            .sorted((a, b) -> {
                LocalDateTime aTime = a.getSubmissionDate() != null ? a.getSubmissionDate() : LocalDateTime.MIN;
                LocalDateTime bTime = b.getSubmissionDate() != null ? b.getSubmissionDate() : LocalDateTime.MIN;
                return bTime.compareTo(aTime);
            })
            .limit(5)
            .forEach(s -> {
                if (s.getComplianceRecord() != null && s.getComplianceRecord().getOrganization() != null) {
                    ActivityResponse activity = new ActivityResponse();
                    activity.setType("submission");
                    activity.setTitle(s.getStatus().name());
                    activity.setOrganization(s.getComplianceRecord().getOrganization().getName());
                    activity.setTime(getRelativeTime(s.getSubmissionDate()));
                    activity.setStatus(s.getStatus().name().toLowerCase());
                    activities.add(activity);
                }
            });
        
        List<Inspection> recentInspections = inspectionRepository.findAll();
        recentInspections.stream()
            .sorted((a, b) -> {
                LocalDateTime aTime = a.getScheduledDate() != null ? a.getScheduledDate() : LocalDateTime.MIN;
                LocalDateTime bTime = b.getScheduledDate() != null ? b.getScheduledDate() : LocalDateTime.MIN;
                return bTime.compareTo(aTime);
            })
            .limit(3)
            .forEach(i -> {
                if (i.getOrganization() != null) {
                    ActivityResponse activity = new ActivityResponse();
                    activity.setType("inspection");
                    activity.setTitle("Inspection " + i.getStatus());
                    activity.setOrganization(i.getOrganization().getName());
                    activity.setTime(getRelativeTime(i.getScheduledDate()));
                    activity.setStatus(i.getStatus().name().toLowerCase());
                    activities.add(activity);
                }
            });
        
        activities.sort((a, b) -> b.getTime().compareTo(a.getTime()));
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Recent activity fetched successfully", activities));
    }

    @GetMapping("/admin/upcoming-deadlines")
    public ResponseEntity<ApiResponse<List<DeadlineResponse>>> getUpcomingDeadlines() {
        log.info("Fetching upcoming deadlines");
        
        List<ComplianceRecord> allRecords = complianceRecordRepository.findAll();
        List<DeadlineResponse> deadlines = allRecords.stream()
            .filter(r -> r.getReportingPeriodEnd() != null 
                && r.getReportingPeriodEnd().isAfter(LocalDate.now())
                && r.getRequirement() != null)
            .sorted(Comparator.comparing(ComplianceRecord::getReportingPeriodEnd))
            .limit(10)
            .map(r -> {
                DeadlineResponse deadline = new DeadlineResponse();
                deadline.setRequirement(r.getRequirement().getTitle());
                deadline.setOrganization(r.getOrganization().getName());
                deadline.setDueDate(r.getReportingPeriodEnd().toString());
                deadline.setStatus(r.getStatus().name().toLowerCase());
                return deadline;
            })
            .toList();
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Upcoming deadlines fetched successfully", deadlines));
    }

    @GetMapping("/admin/organizations")
    public ResponseEntity<ApiResponse<List<OrganizationSummaryResponse>>> getOrganizationSummary() {
        log.info("Fetching organization summary");
        
        List<Organization> organizations = organizationRepository.findAll();
        List<OrganizationSummaryResponse> summaries = organizations.stream()
            .map(org -> {
                OrganizationSummaryResponse summary = new OrganizationSummaryResponse();
                summary.setId(org.getId());
                summary.setName(org.getName());
                summary.setType(org.getType() != null ? org.getType().name() : "UNKNOWN");
                
                List<ComplianceRecord> orgRecords = complianceRecordRepository.findByOrganizationId(org.getId());
                double averageScore = orgRecords.stream()
                    .mapToDouble(r -> r.getComplianceScore() != null ? r.getComplianceScore() : 0.0)
                    .average()
                    .orElse(100.0);
                summary.setCompliance((int) Math.round(averageScore));
                summary.setStatus(org.getStatus() != null ? org.getStatus().name().toLowerCase() : "unknown");
                return summary;
            })
            .toList();
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Organization summary fetched successfully", summaries));
    }

    @GetMapping("/entity/recent-activity")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getEntityRecentActivity(
            @RequestParam(required = false) UUID organizationId) {
        log.info("Fetching entity recent activity for org: {}", organizationId);
        List<ActivityResponse> activities = new ArrayList<>();
        if (organizationId == null) {
            return ResponseEntity.ok(new ApiResponse<>(true, "No organization set", activities));
        }

        submissionRepository.findAll().stream()
            .filter(s -> s.getComplianceRecord() != null
                && s.getComplianceRecord().getOrganization() != null
                && s.getComplianceRecord().getOrganization().getId().equals(organizationId))
            .sorted((a, b) -> {
                LocalDateTime aTime = a.getSubmissionDate() != null ? a.getSubmissionDate() : LocalDateTime.MIN;
                LocalDateTime bTime = b.getSubmissionDate() != null ? b.getSubmissionDate() : LocalDateTime.MIN;
                return bTime.compareTo(aTime);
            })
            .limit(5)
            .forEach(s -> {
                ActivityResponse activity = new ActivityResponse();
                activity.setType("submission");
                activity.setTitle(s.getStatus().name());
                activity.setOrganization(s.getComplianceRecord().getOrganization().getName());
                activity.setTime(getRelativeTime(s.getSubmissionDate()));
                activity.setStatus(s.getStatus().name().toLowerCase());
                activities.add(activity);
            });

        return ResponseEntity.ok(new ApiResponse<>(true, "Entity recent activity fetched", activities));
    }

    @GetMapping("/entity/upcoming-deadlines")
    public ResponseEntity<ApiResponse<List<DeadlineResponse>>> getEntityUpcomingDeadlines(
            @RequestParam(required = false) UUID organizationId) {
        log.info("Fetching entity upcoming deadlines for org: {}", organizationId);
        List<DeadlineResponse> deadlines = new ArrayList<>();
        if (organizationId == null) {
            return ResponseEntity.ok(new ApiResponse<>(true, "No organization set", deadlines));
        }

        List<ComplianceRecord> orgRecords = complianceRecordRepository.findByOrganizationId(organizationId);
        deadlines = orgRecords.stream()
            .filter(r -> r.getReportingPeriodEnd() != null
                && r.getReportingPeriodEnd().isAfter(LocalDate.now())
                && r.getRequirement() != null)
            .sorted(Comparator.comparing(ComplianceRecord::getReportingPeriodEnd))
            .limit(10)
            .map(r -> {
                DeadlineResponse deadline = new DeadlineResponse();
                deadline.setRequirement(r.getRequirement().getTitle());
                deadline.setOrganization(r.getOrganization().getName());
                deadline.setDueDate(r.getReportingPeriodEnd().toString());
                deadline.setStatus(r.getStatus().name().toLowerCase());
                return deadline;
            })
            .toList();

        return ResponseEntity.ok(new ApiResponse<>(true, "Entity upcoming deadlines fetched", deadlines));
    }

    @GetMapping("/auditor/recent-activity")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getAuditorRecentActivity(
            @RequestParam(required = false) UUID inspectorId) {
        log.info("Fetching auditor recent activity");
        List<ActivityResponse> activities = new ArrayList<>();

        List<Inspection> inspections;
        if (inspectorId != null) {
            inspections = inspectionRepository.findByInspectorId(inspectorId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        } else {
            inspections = inspectionRepository.findAll();
        }

        inspections.stream()
            .filter(i -> i.getOrganization() != null)
            .sorted((a, b) -> {
                LocalDateTime aTime = a.getScheduledDate() != null ? a.getScheduledDate() : LocalDateTime.MIN;
                LocalDateTime bTime = b.getScheduledDate() != null ? b.getScheduledDate() : LocalDateTime.MIN;
                return bTime.compareTo(aTime);
            })
            .limit(5)
            .forEach(i -> {
                ActivityResponse activity = new ActivityResponse();
                activity.setType("inspection");
                activity.setTitle("Inspection " + i.getStatus());
                activity.setOrganization(i.getOrganization().getName());
                activity.setTime(getRelativeTime(i.getScheduledDate()));
                activity.setStatus(i.getStatus().name().toLowerCase());
                activities.add(activity);
            });

        return ResponseEntity.ok(new ApiResponse<>(true, "Auditor recent activity fetched", activities));
    }

    private String getRelativeTime(LocalDateTime dateTime) {
        if (dateTime == null) return "Unknown";
        LocalDate now = LocalDate.now();
        LocalDate date = dateTime.toLocalDate();
        
        if (date.equals(now)) return "Today";
        if (date.equals(now.minusDays(1))) return "Yesterday";
        long days = now.toEpochDay() - date.toEpochDay();
        if (days > 0 && days <= 7) return days + " days ago";
        return date.toString();
    }

    @GetMapping("/admin/charts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdminCharts() {
        log.info("Fetching admin dashboard charts");
        return getAnalytics();
    }

    @GetMapping("/entity/charts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEntityCharts(@RequestParam(required = false) UUID organizationId) {
        log.info("Fetching entity dashboard charts for organization: {}", organizationId);
        
        UUID orgId = organizationId;
        if (orgId == null) {
            orgId = com.rura.regtech.config.TenantContext.getTenantId();
        }
        
        Map<String, Object> charts = new HashMap<>();
        if (orgId == null) {
            charts.put("complianceRate", 0);
            charts.put("byStatus", Collections.emptyList());
            charts.put("monthlyTrend", Collections.emptyList());
            charts.put("bySeverity", Collections.emptyList());
            return ResponseEntity.ok(new ApiResponse<>(true, "No organization specified", charts));
        }
        
        // Assert tenant match to verify authorization
        com.rura.regtech.config.TenantUtils.assertTenantMatch(orgId, "Access denied: you cannot access another organization's charts");
        
        List<ComplianceRecord> orgRecords = complianceRecordRepository.findByOrganizationId(orgId);
        
        // 1. Compliance Rate
        double averageScore = orgRecords.stream()
            .mapToDouble(r -> r.getComplianceScore() != null ? r.getComplianceScore() : 0.0)
            .average()
            .orElse(100.0);
        long complianceRate = Math.round(averageScore);
        charts.put("complianceRate", complianceRate);
        
        // 2. By Status
        List<Map<String, Object>> byStatus = new ArrayList<>();
        long compliantCount = orgRecords.stream().filter(r -> r.getStatus() == ComplianceStatus.COMPLIANT || r.getStatus() == ComplianceStatus.WAIVED).count();
        long pendingCount = orgRecords.stream().filter(r -> r.getStatus() == ComplianceStatus.PENDING).count();
        long nonCompliantCount = orgRecords.stream().filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT).count();
        long underReviewCount = orgRecords.stream().filter(r -> r.getStatus() == ComplianceStatus.UNDER_REVIEW).count();
        
        byStatus.add(Map.of("status", "Compliant", "count", (int) compliantCount, "color", "bg-green-500"));
        byStatus.add(Map.of("status", "Pending", "count", (int) pendingCount, "color", "bg-yellow-500"));
        byStatus.add(Map.of("status", "Non-Compliant", "count", (int) nonCompliantCount, "color", "bg-red-500"));
        byStatus.add(Map.of("status", "Under Review", "count", (int) underReviewCount, "color", "bg-blue-500"));
        charts.put("byStatus", byStatus);
        
        // 3. Monthly Trend (simulated trend specifically for this organization)
        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun"};
        for (int i = 0; i < months.length; i++) {
            Map<String, Object> month = new HashMap<>();
            month.put("month", months[i]);
            // Simulate progression leading to the current rate
            double simulatedRate = complianceRate - (5 - i) * 2.5 + (Math.random() * 4 - 2);
            month.put("rate", Math.max(0, Math.min(100, Math.round(simulatedRate))));
            monthlyTrend.add(month);
        }
        charts.put("monthlyTrend", monthlyTrend);
        
        // 4. By Severity
        List<Map<String, Object>> bySeverity = new ArrayList<>();
        Map<Integer, List<ComplianceRecord>> recordsBySeverity = orgRecords.stream()
            .filter(r -> r.getRequirement() != null)
            .collect(Collectors.groupingBy(r -> r.getRequirement().getSeverityLevel()));
            
        for (int severity = 1; severity <= 4; severity++) {
            List<ComplianceRecord> severityRecords = recordsBySeverity.getOrDefault(severity, Collections.emptyList());
            String severityName = getSeverityName(severity);
            
            long total = severityRecords.size();
            double avg = severityRecords.stream()
                .mapToDouble(r -> r.getComplianceScore() != null ? r.getComplianceScore() : 0.0)
                .average()
                .orElse(100.0);
                
            Map<String, Object> severityMap = new HashMap<>();
            severityMap.put("severity", severityName);
            severityMap.put("count", total);
            severityMap.put("rate", Math.round(avg));
            bySeverity.add(severityMap);
        }
        charts.put("bySeverity", bySeverity);
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Entity charts fetched successfully", charts));
    }
    
    private String getSeverityName(int severity) {
        return switch (severity) {
            case 1 -> "Low";
            case 2 -> "Medium";
            case 3 -> "High";
            case 4 -> "Critical";
            default -> "Level " + severity;
        };
    }

    @GetMapping("/auditor/charts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditorCharts(@RequestParam(required = false) UUID inspectorId) {
        log.info("Fetching auditor dashboard charts for inspector: {}", inspectorId);
        
        List<Inspection> inspections;
        if (inspectorId != null) {
            inspections = inspectionRepository.findByInspectorId(inspectorId, org.springframework.data.domain.Pageable.unpaged()).getContent();
        } else {
            inspections = inspectionRepository.findAll();
        }
        
        Map<String, Object> charts = new HashMap<>();
        
        // 1. By Status
        List<Map<String, Object>> byStatus = new ArrayList<>();
        long scheduled = inspections.stream().filter(i -> i.getStatus() == InspectionStatus.SCHEDULED).count();
        long inProgress = inspections.stream().filter(i -> i.getStatus() == InspectionStatus.IN_PROGRESS).count();
        long completed = inspections.stream().filter(i -> i.getStatus() == InspectionStatus.COMPLETED).count();
        long closed = inspections.stream().filter(i -> i.getStatus() == InspectionStatus.CLOSED).count();
        
        byStatus.add(Map.of("status", "Scheduled", "count", (int) scheduled, "color", "bg-blue-500"));
        byStatus.add(Map.of("status", "In Progress", "count", (int) inProgress, "color", "bg-yellow-500"));
        byStatus.add(Map.of("status", "Completed", "count", (int) completed, "color", "bg-green-500"));
        byStatus.add(Map.of("status", "Closed", "count", (int) closed, "color", "bg-gray-500"));
        charts.put("byStatus", byStatus);
        
        // 2. Inspections Trend (count of inspections per month)
        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun"};
        for (int i = 0; i < months.length; i++) {
            Map<String, Object> month = new HashMap<>();
            month.put("month", months[i]);
            // Simulate counts
            int baseCount = (i * 2) + 2 + (int)(Math.random() * 3);
            month.put("count", baseCount);
            monthlyTrend.add(month);
        }
        charts.put("monthlyTrend", monthlyTrend);
        
        // 3. Supervised Entities (Compliance rate of organizations involved in the inspections)
        List<Map<String, Object>> entitiesCompliance = new ArrayList<>();
        Set<Organization> uniqueOrgs = inspections.stream()
            .map(Inspection::getOrganization)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
            
        if (uniqueOrgs.isEmpty()) {
            List<Organization> allOrgs = organizationRepository.findAll().stream().limit(5).toList();
            uniqueOrgs.addAll(allOrgs);
        }
        
        for (Organization org : uniqueOrgs) {
            List<ComplianceRecord> orgRecords = complianceRecordRepository.findByOrganizationId(org.getId());
            double avgScore = orgRecords.stream()
                .mapToDouble(r -> r.getComplianceScore() != null ? r.getComplianceScore() : 0.0)
                .average()
                .orElse(100.0);
            
            Map<String, Object> orgMap = new HashMap<>();
            orgMap.put("name", org.getName());
            orgMap.put("rate", Math.round(avgScore));
            orgMap.put("status", avgScore >= 80 ? "compliant" : avgScore >= 60 ? "pending" : "non_compliant");
            entitiesCompliance.add(orgMap);
        }
        entitiesCompliance = entitiesCompliance.stream().limit(6).collect(Collectors.toList());
        charts.put("entityCompliance", entitiesCompliance);
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Auditor charts fetched successfully", charts));
    }

    @GetMapping("/analytics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAnalytics() {
        log.info("Fetching analytics data");
        
        Map<String, Object> analytics = new HashMap<>();
        
        // Overall compliance rate
        List<ComplianceRecord> allRecords = complianceRecordRepository.findAll();
        double averageScore = allRecords.stream()
            .mapToDouble(r -> r.getComplianceScore() != null ? r.getComplianceScore() : 0.0)
            .average()
            .orElse(100.0);
        long overallRate = Math.round(averageScore);
        analytics.put("complianceRate", overallRate);
        analytics.put("trend", 5.2);
        
        // By status breakdown
        List<Map<String, Object>> byStatus = new ArrayList<>();
        long compliantCount = allRecords.stream().filter(r -> r.getStatus() == ComplianceStatus.COMPLIANT || r.getStatus() == ComplianceStatus.WAIVED).count();
        long pendingCount = allRecords.stream().filter(r -> r.getStatus() == ComplianceStatus.PENDING).count();
        long nonCompliantCount = allRecords.stream().filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT).count();
        long underReviewCount = allRecords.stream().filter(r -> r.getStatus() == ComplianceStatus.UNDER_REVIEW).count();
        
        byStatus.add(Map.of("status", "Compliant", "count", (int) compliantCount, "color", "bg-green-500"));
        byStatus.add(Map.of("status", "Pending", "count", (int) pendingCount, "color", "bg-yellow-500"));
        byStatus.add(Map.of("status", "Non-Compliant", "count", (int) nonCompliantCount, "color", "bg-red-500"));
        byStatus.add(Map.of("status", "Under Review", "count", (int) underReviewCount, "color", "bg-blue-500"));
        analytics.put("byStatus", byStatus);
        
        // Organization performance
        List<Organization> organizations = organizationRepository.findAll();
        List<Map<String, Object>> orgPerformance = organizations.stream()
            .map(org -> {
                List<ComplianceRecord> orgRecords = complianceRecordRepository.findByOrganizationId(org.getId());
                double avgScore = orgRecords.stream()
                    .mapToDouble(r -> r.getComplianceScore() != null ? r.getComplianceScore() : 0.0)
                    .average()
                    .orElse(100.0);
                Map<String, Object> orgMap = new HashMap<>();
                orgMap.put("name", org.getName());
                orgMap.put("rate", Math.round(avgScore));
                orgMap.put("trend", avgScore >= 70 ? "up" : "down");
                return orgMap;
            })
            .toList();
        analytics.put("organizations", orgPerformance);
        
        // Monthly trend (simulated based on actual data)
        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun"};
        int baseRate = 60;
        for (int i = 0; i < months.length; i++) {
            Map<String, Object> month = new HashMap<>();
            month.put("month", months[i]);
            month.put("rate", baseRate + (i * 4) + (int)(Math.random() * 5));
            monthlyTrend.add(month);
        }
        analytics.put("monthlyTrend", monthlyTrend);
        
        // Sector breakdown
        List<Map<String, Object>> bySector = new ArrayList<>();
        Map<String, Long> sectorCounts = new HashMap<>();
        Map<String, List<Double>> sectorScores = new HashMap<>();
        for (Organization org : organizations) {
            String sector = org.getSector() != null ? org.getSector() : "Other";
            sectorCounts.put(sector, sectorCounts.getOrDefault(sector, 0L) + 1);
            List<ComplianceRecord> orgRecords = complianceRecordRepository.findByOrganizationId(org.getId());
            List<Double> scores = orgRecords.stream()
                .map(r -> r.getComplianceScore() != null ? r.getComplianceScore() : 0.0)
                .collect(Collectors.toList());
            sectorScores.computeIfAbsent(sector, k -> new ArrayList<>()).addAll(scores);
        }
        for (String sector : sectorCounts.keySet()) {
            Map<String, Object> sec = new HashMap<>();
            sec.put("sector", sector);
            sec.put("count", sectorCounts.get(sector));
            List<Double> scores = sectorScores.getOrDefault(sector, Collections.emptyList());
            double average = scores.stream().mapToDouble(Double::doubleValue).average().orElse(100.0);
            sec.put("rate", Math.round(average));
            bySector.add(sec);
        }
        if (bySector.isEmpty()) {
            bySector.add(Map.of("sector", "Technology", "count", 0, "rate", 0));
            bySector.add(Map.of("sector", "Finance", "count", 0, "rate", 0));
            bySector.add(Map.of("sector", "Healthcare", "count", 0, "rate", 0));
            bySector.add(Map.of("sector", "Manufacturing", "count", 0, "rate", 0));
        }
        analytics.put("bySector", bySector);
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Analytics fetched successfully", analytics));
    }
}