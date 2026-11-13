package com.rura.regtech.controller;

import com.rura.regtech.dto.response.ApiResponse;
import com.rura.regtech.entity.*;
import com.rura.regtech.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Slf4j
public class AIController {

    private final OrganizationRepository organizationRepository;
    private final RegulationRepository regulationRepository;
    private final ComplianceRequirementRepository complianceRequirementRepository;
    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;

    @Value("${ai.groq.api-key:}")
    private String apiKey;

    @Value("${ai.groq.base-url:https://api.groq.com/openai/v1}")
    private String baseUrl;

    @Value("${ai.groq.model:llama-3.1-70b-versatile}")
    private String model;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<Map<String, String>>> chat(@RequestBody Map<String, String> request) {
        String userMessage = request.get("message");
        String context = request.getOrDefault("context", "regulatory compliance");
        
        String dbContext = fetchDatabaseContext();
        String prompt = buildPrompt(userMessage, context, dbContext);
        String response = callGroqAPI(prompt);
        
        if (response == null) {
            response = generateLocalChatResponse(userMessage, dbContext);
        }
        
        Map<String, String> result = new HashMap<>();
        result.put("response", response);
        
        return ResponseEntity.ok(new ApiResponse<>(true, "AI response generated", result));
    }

    @PostMapping("/compliance-analysis")
    public ResponseEntity<ApiResponse<Map<String, Object>>> analyzeCompliance(@RequestBody Map<String, Object> data) {
        String organization = (String) data.getOrDefault("organization", "Unknown");
        String complianceStatus = (String) data.getOrDefault("complianceStatus", "");
        double score = ((Number) data.getOrDefault("score", 0)).doubleValue();
        
        String prompt = String.format("""
            You are a regulatory compliance expert for Rwanda's RURA (Regulatory Authority).
            Analyze the following compliance data and provide actionable insights:
            
            Organization: %s
            Compliance Status: %s
            Compliance Score: %.1f%%
            
            Provide:
            1. Key findings (2-3 sentences)
            2. Risk assessment (high/medium/low)
            3. Recommended actions (3-5 bullet points)
            4. Priority areas for improvement
            
            Be concise and professional.
            """, organization, complianceStatus, score);
        
        String response = callGroqAPI(prompt);
        
        if (response == null) {
            response = generateLocalComplianceAnalysis(organization, complianceStatus, score);
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("analysis", response);
        result.put("timestamp", new Date().toString());
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Compliance analysis generated", result));
    }

    @PostMapping("/inspection-recommendations")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getInspectionRecommendations(@RequestBody Map<String, Object> data) {
        String organization = (String) data.getOrDefault("organization", "Unknown");
        String inspectionType = (String) data.getOrDefault("inspectionType", "general");
        String findings = (String) data.getOrDefault("findings", "No specific findings");
        
        String prompt = String.format("""
            You are a regulatory inspector for Rwanda's RURA.
            Based on the following inspection data, provide expert recommendations:
            
            Organization: %s
            Inspection Type: %s
            Findings: %s
            
            Provide:
            1. Severity assessment
            2. Required corrective actions (prioritized)
            3. Timeline recommendations
            4. Follow-up requirements
            5. Any penalties to consider
            
            Be specific and actionable.
            """, organization, inspectionType, findings);
        
        String response = callGroqAPI(prompt);
        
        if (response == null) {
            response = generateLocalInspectionRecommendations(organization, inspectionType, findings);
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("recommendations", response);
        result.put("timestamp", new Date().toString());
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Recommendations generated", result));
    }

    @PostMapping("/report-summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateReportSummary(@RequestBody Map<String, Object> data) {
        String reportType = (String) data.getOrDefault("reportType", "compliance");
        String period = (String) data.getOrDefault("period", "Q4 2024");
        int totalRecords = ((Number) data.getOrDefault("totalRecords", 0)).intValue();
        int compliant = ((Number) data.getOrDefault("compliant", 0)).intValue();
        int nonCompliant = ((Number) data.getOrDefault("nonCompliant", 0)).intValue();
        
        String prompt = String.format("""
            You are a compliance analyst for Rwanda's RURA regulatory authority.
            Generate an executive summary for a compliance report:
            
            Report Type: %s
            Period: %s
            Total Records: %d
            Compliant: %d
            Non-Compliant: %d
            Compliance Rate: %.1f%%
            
            Provide:
            1. Executive summary (2-3 sentences)
            2. Key highlights
            3. Areas of concern
            4. Recommendations for next period
            
            Be professional and data-driven.
            """, reportType, period, totalRecords, compliant, nonCompliant, 
              totalRecords > 0 ? (compliant * 100.0 / totalRecords) : 0);
        
        String response = callGroqAPI(prompt);
        
        if (response == null) {
            response = generateLocalReportSummary(reportType, period, totalRecords, compliant, nonCompliant);
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("summary", response);
        result.put("generatedAt", new Date().toString());
        
        return ResponseEntity.ok(new ApiResponse<>(true, "Report summary generated", result));
    }

    private String buildPrompt(String userMessage, String context, String dbContext) {
        return String.format("""
            You are an AI assistant for Coquelin, Rwanda's regulatory compliance platform managed by RURA.
            You help users with regulatory compliance, inspections, and enforcement.
            
            Context: %s
            
            DATABASE INFORMATION:
            %s
            
            User question: %s
            
            Provide a helpful, accurate, and professional response based on the database information above. Keep it concise but informative.
            """, context, dbContext, userMessage);
    }

    private String fetchDatabaseContext() {
        StringBuilder sb = new StringBuilder();
        
        List<Organization> orgs = organizationRepository.findAll();
        sb.append("\n=== ORGANIZATIONS (").append(orgs.size()).append(") ===\n");
        for (Organization org : orgs.stream().limit(20).collect(Collectors.toList())) {
            sb.append(String.format("- %s [%s] Sector: %s, Status: %s, Risk: %s\n",
                org.getName(), org.getRegistrationNumber(), org.getSector(), 
                org.getStatus(), org.getRiskLevel()));
        }
        
        List<Regulation> regs = regulationRepository.findAllByDeletedFalse(org.springframework.data.domain.Pageable.unpaged()).getContent();
        sb.append("\n=== REGULATIONS (").append(regs.size()).append(") ===\n");
        for (Regulation reg : regs.stream().limit(10).collect(Collectors.toList())) {
            sb.append(String.format("- %s [%s] Effective: %s\n",
                reg.getTitle(), reg.getSector(), reg.getEffectiveDate()));
        }
        
        List<ComplianceRequirement> reqs = complianceRequirementRepository.findAll();
        sb.append("\n=== COMPLIANCE REQUIREMENTS (").append(reqs.size()).append(") ===\n");
        for (ComplianceRequirement req : reqs.stream().limit(10).collect(Collectors.toList())) {
            sb.append(String.format("- %s: %s\n", req.getTitle(), 
                req.getDescription() != null ? req.getDescription().substring(0, Math.min(100, req.getDescription().length())) : ""));
        }
        
        List<User> users = userRepository.findAll();
        sb.append("\n=== USERS (").append(users.size()).append(") ===\n");
        long activeUsers = users.stream().filter(u -> u.getStatus() == com.rura.regtech.entity.enums.UserStatus.ACTIVE).count();
        long suspendedUsers = users.stream().filter(u -> u.getStatus() == com.rura.regtech.entity.enums.UserStatus.SUSPENDED).count();
        sb.append(String.format("Active: %d, Suspended: %d, Total: %d\n", activeUsers, suspendedUsers, users.size()));
        
        Map<com.rura.regtech.entity.enums.RoleName, Long> roleCounts = users.stream()
            .flatMap(u -> u.getRoles().stream())
            .collect(java.util.stream.Collectors.groupingBy(Role::getName, java.util.stream.Collectors.counting()));
        sb.append("Role breakdown: ").append(roleCounts).append("\n");
        
        List<Submission> subs = submissionRepository.findAll();
        sb.append("\n=== SUBMISSIONS (").append(subs.size()).append(") ===\n");
        long submittedSubs = subs.stream().filter(s -> s.getStatus() == com.rura.regtech.entity.enums.SubmissionStatus.SUBMITTED).count();
        long approvedSubs = subs.stream().filter(s -> s.getStatus() == com.rura.regtech.entity.enums.SubmissionStatus.APPROVED).count();
        long rejectedSubs = subs.stream().filter(s -> s.getStatus() == com.rura.regtech.entity.enums.SubmissionStatus.REJECTED).count();
        long draftSubs = subs.stream().filter(s -> s.getStatus() == com.rura.regtech.entity.enums.SubmissionStatus.DRAFT).count();
        sb.append(String.format("Draft: %d, Submitted: %d, Approved: %d, Rejected: %d\n", draftSubs, submittedSubs, approvedSubs, rejectedSubs));
        
        return sb.toString();
    }

    private String callGroqAPI(String prompt) {
        if (apiKey == null || apiKey.isEmpty() || "your-api-key-here".equals(apiKey)) {
            log.warn("Groq API key not configured");
            return null;
        }
        try {
            log.info("Calling Groq API with model: {}", model);
            
            RestTemplate restTemplate = new RestTemplate();
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(
                Map.of("role", "user", "content", prompt)
            ));
            requestBody.put("temperature", 0.7);
            requestBody.put("max_tokens", 1500);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", "Bearer " + apiKey);
            headers.set("Content-Type", "application/json");

            org.springframework.http.HttpEntity<Map<String, Object>> request = 
                new org.springframework.http.HttpEntity<>(requestBody, headers);

            String url = baseUrl + "/chat/completions";
            log.debug("Request URL: {}", url);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            
            log.debug("Response: {}", response);
            
            if (response != null && response.containsKey("choices")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }
            log.warn("Groq API returned unexpected response");
            return null;
        } catch (Exception e) {
            log.error("Error calling Groq API: {} - {}", e.getClass().getName(), e.getMessage());
            if (e.getCause() != null) {
                log.error("Caused by: {} - {}", e.getCause().getClass().getName(), e.getCause().getMessage());
            }
            return null;
        }
    }

    private String generateLocalChatResponse(String userMessage, String dbContext) {
        StringBuilder sb = new StringBuilder();
        String lower = userMessage.toLowerCase();

        sb.append("Based on the current database:\n\n");

        if (lower.contains("organization") || lower.contains("entity") || lower.contains("company")) {
            List<Organization> orgs = organizationRepository.findAll();
            sb.append("**Organizations:** ").append(orgs.size()).append(" registered\n");
            for (Organization org : orgs.stream().limit(5).collect(Collectors.toList())) {
                sb.append("- ").append(org.getName()).append(" (").append(org.getSector()).append(") — Status: ").append(org.getStatus()).append("\n");
            }
            if (orgs.size() > 5) sb.append("- ... and ").append(orgs.size() - 5).append(" more\n");
        } else if (lower.contains("regulation") || lower.contains("rule") || lower.contains("law")) {
            List<Regulation> regs = regulationRepository.findAllByDeletedFalse(org.springframework.data.domain.Pageable.unpaged()).getContent();
            sb.append("**Regulations:** ").append(regs.size()).append(" active\n");
            for (Regulation reg : regs.stream().limit(5).collect(Collectors.toList())) {
                sb.append("- ").append(reg.getTitle()).append(" (").append(reg.getSector()).append(") — ").append(reg.getStatus()).append("\n");
            }
        } else if (lower.contains("submission") || lower.contains("submit")) {
            List<Submission> subs = submissionRepository.findAll();
            long draft = subs.stream().filter(s -> s.getStatus() == com.rura.regtech.entity.enums.SubmissionStatus.DRAFT).count();
            long submitted = subs.stream().filter(s -> s.getStatus() == com.rura.regtech.entity.enums.SubmissionStatus.SUBMITTED).count();
            long approved = subs.stream().filter(s -> s.getStatus() == com.rura.regtech.entity.enums.SubmissionStatus.APPROVED).count();
            long rejected = subs.stream().filter(s -> s.getStatus() == com.rura.regtech.entity.enums.SubmissionStatus.REJECTED).count();
            sb.append("**Submissions:** ").append(subs.size()).append(" total\n");
            sb.append("- Draft: ").append(draft).append("\n");
            sb.append("- Submitted: ").append(submitted).append("\n");
            sb.append("- Approved: ").append(approved).append("\n");
            sb.append("- Rejected: ").append(rejected).append("\n");
        } else if (lower.contains("user") || lower.contains("staff")) {
            List<User> users = userRepository.findAll();
            long active = users.stream().filter(u -> u.getStatus() == com.rura.regtech.entity.enums.UserStatus.ACTIVE).count();
            sb.append("**Users:** ").append(users.size()).append(" total (").append(active).append(" active)\n");
        } else {
            sb.append(dbContext);
        }

        sb.append("\n*Note: AI service is temporarily unavailable. This is a database-based response.*");
        return sb.toString();
    }

    private String generateLocalComplianceAnalysis(String organization, String complianceStatus, double score) {
        StringBuilder sb = new StringBuilder();
        sb.append("Compliance Analysis Report\n\n");
        sb.append("Organization: ").append(organization).append("\n");
        sb.append("Status: ").append(complianceStatus).append("\n");
        sb.append("Score: ").append(String.format("%.1f%%", score)).append("\n\n");

        sb.append("Key Findings:\n");
        if (score >= 80) {
            sb.append("- Organization demonstrates strong compliance posture with a score of ").append(String.format("%.0f%%", score)).append("\n");
            sb.append("- Minor areas for improvement identified in documentation completeness\n");
        } else if (score >= 50) {
            sb.append("- Organization shows partial compliance with room for improvement\n");
            sb.append("- Score of ").append(String.format("%.0f%%", score)).append(" indicates gaps in regulatory adherence\n");
        } else {
            sb.append("- Organization has significant compliance gaps requiring immediate attention\n");
            sb.append("- Score of ").append(String.format("%.0f%%", score)).append(" indicates critical non-compliance\n");
        }

        sb.append("\nRisk Assessment: ");
        if (score >= 80) sb.append("LOW");
        else if (score >= 50) sb.append("MEDIUM");
        else sb.append("HIGH");
        sb.append("\n");

        sb.append("\nRecommended Actions:\n");
        sb.append("- Review and update all compliance documentation\n");
        sb.append("- Schedule follow-up assessment within 30 days\n");
        sb.append("- Assign compliance officer to monitor progress\n");
        if (score < 50) sb.append("- Issue formal notice of non-compliance with corrective action deadline\n");

        sb.append("\n*Note: AI service is temporarily unavailable. This is a rule-based analysis.*");
        return sb.toString();
    }

    private String generateLocalInspectionRecommendations(String organization, String inspectionType, String findings) {
        StringBuilder sb = new StringBuilder();
        sb.append("Inspection Recommendations\n\n");
        sb.append("Organization: ").append(organization).append("\n");
        sb.append("Inspection Type: ").append(inspectionType).append("\n");
        sb.append("Findings: ").append(findings).append("\n\n");

        boolean hasHigh = findings.toLowerCase().contains("high") || findings.toLowerCase().contains("critical") || findings.toLowerCase().contains("violation");
        boolean hasMedium = findings.toLowerCase().contains("medium") || findings.toLowerCase().contains("moderate");

        sb.append("Severity Assessment: ");
        if (hasHigh) sb.append("HIGH — Immediate action required\n");
        else if (hasMedium) sb.append("MEDIUM — Action required within 30 days\n");
        else sb.append("LOW — Monitor and improve gradually\n");

        sb.append("\nRequired Corrective Actions:\n");
        sb.append("1. Conduct thorough review of non-compliant areas\n");
        sb.append("2. Develop corrective action plan with timeline\n");
        sb.append("3. Implement changes and document evidence\n");
        if (hasHigh) sb.append("4. Escalate to regulatory board for enforcement review\n");

        sb.append("\nTimeline: ");
        if (hasHigh) sb.append("14 business days for initial response, 30 days for full remediation\n");
        else sb.append("30 business days for corrective action implementation\n");

        sb.append("\nFollow-up: Schedule re-inspection to verify remediation completion.\n");

        sb.append("\n*Note: AI service is temporarily unavailable. This is a rule-based recommendation.*");
        return sb.toString();
    }

    private String generateLocalReportSummary(String reportType, String period, int totalRecords, int compliant, int nonCompliant) {
        double rate = totalRecords > 0 ? (compliant * 100.0 / totalRecords) : 0;
        StringBuilder sb = new StringBuilder();
        sb.append("Executive Summary — ").append(reportType).append(" Report for ").append(period).append("\n\n");

        sb.append("This report covers ").append(totalRecords).append(" compliance records.\n");
        sb.append(String.format("Compliance Rate: %.1f%%\n\n", rate));

        sb.append("Key Highlights:\n");
        sb.append("- ").append(compliant).append(" records are fully compliant\n");
        if (nonCompliant > 0) sb.append("- ").append(nonCompliant).append(" records require corrective action\n");
        sb.append("- Overall compliance trend is ").append(rate >= 80 ? "positive" : rate >= 50 ? "moderate" : "concerning").append("\n");

        sb.append("\nAreas of Concern:\n");
        if (nonCompliant > 0) {
            sb.append("- ").append(nonCompliant).append(" non-compliant record(s) need immediate attention\n");
        }
        sb.append("- Documentation completeness should be verified across all entities\n");

        sb.append("\nRecommendations for Next Period:\n");
        sb.append("- Increase compliance monitoring frequency\n");
        sb.append("- Provide targeted support to non-compliant organizations\n");
        sb.append("- Review and update regulatory requirements as needed\n");

        sb.append("\n*Note: AI service is temporarily unavailable. This is a data-driven summary.*");
        return sb.toString();
    }
}