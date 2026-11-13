package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.AssistantQueryResponse;
import com.rura.regtech.entity.*;
import com.rura.regtech.repository.*;
import com.rura.regtech.service.ComplianceAssistantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplianceAssistantServiceImpl implements ComplianceAssistantService {

    private final OrganizationRepository organizationRepository;
    private final SubmissionRepository submissionRepository;
    private final EvidenceRepository evidenceRepository;
    private final ComplianceRecordRepository complianceRecordRepository;
    private final ComplianceRequirementRepository requirementRepository;
    private final RegulationRepository regulationRepository;

    @Override
    public AssistantQueryResponse answerQuery(String query, Integer maxResults) {
        if (maxResults == null || maxResults < 1) maxResults = 10;
        String lowercase = query.toLowerCase().trim();

        List<AssistantQueryResponse.DocumentReference> refs = new ArrayList<>();
        List<String> parts = new ArrayList<>();

        // Extract any hex hashes (>= 8 chars) from the query to search by file hash
        List<String> hexHashes = new ArrayList<>();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("[0-9a-fA-F]{8,}").matcher(query);
        while (m.find()) hexHashes.add(m.group());

        // Split query into individual words and search each separately
        String[] words = lowercase.split("\\s+");
        Set<String> seenOrgIds = new HashSet<>();
        Set<String> seenReqIds = new HashSet<>();
        Set<String> seenRegIds = new HashSet<>();
        Set<String> seenRecIds = new HashSet<>();
        Set<String> seenSubIds = new HashSet<>();
        Set<String> seenEvIds = new HashSet<>();

        for (String word : words) {
            if (word.length() < 2) continue; // skip single chars
            searchOrganizations(word, refs, parts, seenOrgIds);
            searchRequirements(word, refs, parts, seenReqIds);
            searchRegulations(word, refs, parts, seenRegIds);
            searchComplianceRecords(word, refs, parts, seenRecIds);
            searchSubmissions(word, refs, parts, hexHashes, seenSubIds);
            searchEvidence(word, refs, parts, hexHashes, seenEvIds);
        }

        // If no word-level results, also try the full query as a phrase
        if (refs.isEmpty()) {
            searchOrganizations(lowercase, refs, parts, seenOrgIds);
            searchRequirements(lowercase, refs, parts, seenReqIds);
            searchRegulations(lowercase, refs, parts, seenRegIds);
            searchComplianceRecords(lowercase, refs, parts, seenRecIds);
            searchSubmissions(lowercase, refs, parts, hexHashes, seenSubIds);
            searchEvidence(lowercase, refs, parts, hexHashes, seenEvIds);
        }

        String answer = buildAnswer(query, parts, refs);

        List<AssistantQueryResponse.DocumentReference> sorted = refs.stream()
                .limit(maxResults)
                .collect(Collectors.toList());

        return AssistantQueryResponse.builder()
                .answer(answer)
                .references(sorted)
                .build();
    }

    private void searchOrganizations(String query, List<AssistantQueryResponse.DocumentReference> refs, List<String> parts, Set<String> seenIds) {
        try {
            List<Organization> orgs = organizationRepository.searchByKeyword(query);
            for (Organization org : orgs) {
                String id = org.getId().toString();
                if (seenIds.add(id)) {
                    refs.add(AssistantQueryResponse.DocumentReference.builder()
                            .type("Organization")
                            .id(id)
                            .title(org.getName())
                            .summary("Sector: " + (org.getSector() != null ? org.getSector() : "N/A")
                                    + " | Reg#: " + (org.getRegistrationNumber() != null ? org.getRegistrationNumber() : "N/A")
                                    + " | Status: " + (org.getStatus() != null ? org.getStatus() : "N/A"))
                            .build());
                }
            }
            if (!orgs.isEmpty() && !parts.stream().anyMatch(p -> p.contains("organization"))) {
                parts.add("**" + orgs.size() + " organization(s)** — "
                        + orgs.stream().map(Organization::getName).collect(Collectors.joining(", ")));
            }
        } catch (Exception e) {
            log.warn("Organization search failed: {}", e.getMessage());
        }
    }

    private void searchRequirements(String query, List<AssistantQueryResponse.DocumentReference> refs, List<String> parts, Set<String> seenIds) {
        try {
            List<ComplianceRequirement> reqs = requirementRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(query, query);
            for (ComplianceRequirement req : reqs) {
                String id = req.getId().toString();
                if (seenIds.add(id)) {
                    refs.add(AssistantQueryResponse.DocumentReference.builder()
                            .type("Requirement")
                            .id(id)
                            .title(req.getTitle() != null ? req.getTitle() : "Requirement #" + id.substring(0, 8))
                            .summary((req.getDescription() != null ? req.getDescription().substring(0, Math.min(req.getDescription().length(), 150)) : "No description"))
                            .build());
                }
            }
            if (!reqs.isEmpty() && !parts.stream().anyMatch(p -> p.contains("requirement"))) {
                parts.add("**" + reqs.size() + " requirement(s)** matched your search.");
            }
        } catch (Exception e) {
            log.warn("Requirement search failed: {}", e.getMessage());
        }
    }

    private void searchRegulations(String query, List<AssistantQueryResponse.DocumentReference> refs, List<String> parts, Set<String> seenIds) {
        try {
            List<Regulation> regs = regulationRepository.findByDeletedFalseAndTitleContainingIgnoreCaseOrDeletedFalseAndSectorContainingIgnoreCase(query, query);
            for (Regulation reg : regs) {
                String id = reg.getId().toString();
                if (seenIds.add(id)) {
                    refs.add(AssistantQueryResponse.DocumentReference.builder()
                            .type("Regulation")
                            .id(id)
                            .title(reg.getTitle())
                            .summary("Sector: " + (reg.getSector() != null ? reg.getSector() : "N/A")
                                    + " | Status: " + (reg.getStatus() != null ? reg.getStatus() : "N/A"))
                            .build());
                }
            }
            if (!regs.isEmpty() && !parts.stream().anyMatch(p -> p.contains("regulation"))) {
                parts.add("**" + regs.size() + " regulation(s)** — "
                        + regs.stream().map(Regulation::getTitle).collect(Collectors.joining(", ")));
            }
        } catch (Exception e) {
            log.warn("Regulation search failed: {}", e.getMessage());
        }
    }

    private void searchComplianceRecords(String query, List<AssistantQueryResponse.DocumentReference> refs, List<String> parts, Set<String> seenIds) {
        try {
            List<ComplianceRecord> records = complianceRecordRepository.searchByKeyword(query);
            for (ComplianceRecord rec : records) {
                String id = rec.getId().toString();
                if (seenIds.add(id)) {
                    String orgName = rec.getOrganization() != null ? rec.getOrganization().getName() : "N/A";
                    String reqTitle = rec.getRequirement() != null ? rec.getRequirement().getTitle() : "N/A";
                    refs.add(AssistantQueryResponse.DocumentReference.builder()
                            .type("Compliance Record")
                            .id(id)
                            .title(orgName + " — " + reqTitle)
                            .summary("Status: " + (rec.getStatus() != null ? rec.getStatus() : "N/A")
                                    + " | Score: " + (rec.getComplianceScore() != null ? rec.getComplianceScore() + "%" : "N/A")
                                    + " | Period: " + (rec.getReportingPeriodStart() != null ? rec.getReportingPeriodStart().toString() : "?")
                                    + " to " + (rec.getReportingPeriodEnd() != null ? rec.getReportingPeriodEnd().toString() : "?"))
                            .build());
                }
            }
            if (!records.isEmpty() && !parts.stream().anyMatch(p -> p.contains("compliance record"))) {
                parts.add("**" + records.size() + " compliance record(s)** found matching your search.");
            }
        } catch (Exception e) {
            log.warn("Compliance record search failed: {}", e.getMessage());
        }
    }

    private void searchSubmissions(String query, List<AssistantQueryResponse.DocumentReference> refs, List<String> parts, List<String> hexHashes, Set<String> seenIds) {
        try {
            List<Submission> subs = new ArrayList<>();
            for (String hash : hexHashes) {
                try {
                    List<Submission> found = submissionRepository.searchByFileHash(hash);
                    subs.addAll(found);
                } catch (Exception ignored) {}
                if (!subs.isEmpty()) break;
            }
            if (subs.isEmpty()) {
                subs = submissionRepository.searchByExtractedText(query);
            }
            for (Submission sub : subs) {
                String statusStr = sub.getStatus() != null ? sub.getStatus().toString() : "N/A";
                String orgName = sub.getComplianceRecord() != null && sub.getComplianceRecord().getOrganization() != null
                        ? sub.getComplianceRecord().getOrganization().getName() : null;
                String reqTitle = sub.getComplianceRecord() != null && sub.getComplianceRecord().getRequirement() != null
                        ? sub.getComplianceRecord().getRequirement().getTitle() : null;
                String regName = sub.getComplianceRecord() != null && sub.getComplianceRecord().getRequirement() != null
                        && sub.getComplianceRecord().getRequirement().getRegulation() != null
                        ? sub.getComplianceRecord().getRequirement().getRegulation().getTitle() : null;
                Double compScore = sub.getComplianceRecord() != null ? sub.getComplianceRecord().getComplianceScore() : null;
                String recPeriod = sub.getComplianceRecord() != null && sub.getComplianceRecord().getReportingPeriodStart() != null
                        ? sub.getComplianceRecord().getReportingPeriodStart().toString() + " to " + sub.getComplianceRecord().getReportingPeriodEnd().toString()
                        : null;
                String recStatus = sub.getComplianceRecord() != null && sub.getComplianceRecord().getStatus() != null
                        ? sub.getComplianceRecord().getStatus().toString() : null;

                String snippet;
                if (sub.getExtractedText() != null && !sub.getExtractedText().isEmpty()) {
                    snippet = sub.getExtractedText().substring(0, Math.min(sub.getExtractedText().length(), 200));
                } else if (sub.getAiAnalysisDetails() != null && !sub.getAiAnalysisDetails().isEmpty()) {
                    snippet = sub.getAiAnalysisDetails().substring(0, Math.min(sub.getAiAnalysisDetails().length(), 200));
                } else {
                    snippet = "No OCR text available yet. Click Re-Analyze on the Submission to extract document content.";
                }
                String hashInfo = sub.getFileHash() != null ? " | SHA-256: " + sub.getFileHash() : " | Hash: N/A";
                String aiInfo = "";
                if (sub.getAiAnalysisStatus() != null) {
                    aiInfo = " | AI: " + sub.getAiAnalysisStatus();
                    if (sub.getAiScore() != null) aiInfo += " (score: " + String.format("%.0f", sub.getAiScore() * 100) + "%)";
                }
                String dateInfo = sub.getSubmissionDate() != null ? " | Submitted: " + sub.getSubmissionDate().toString().substring(0, 10) : "";
                String commentInfo = sub.getReviewComment() != null ? " | Comment: " + sub.getReviewComment() : "";
                String scoreInfo = compScore != null ? " | Compliance Score: " + String.format("%.0f", compScore) + "%" : "";
                String periodInfo = recPeriod != null ? " | Period: " + recPeriod : "";
                String recStatusInfo = recStatus != null ? " | Record Status: " + recStatus : "";
                String regInfo = regName != null ? " | Regulation: " + regName : "";

                StringBuilder summary = new StringBuilder();
                summary.append("Status: ").append(statusStr);
                summary.append(aiInfo);
                summary.append(scoreInfo);
                summary.append(recStatusInfo);
                summary.append(hashInfo);
                if (orgName != null) summary.append(" | Org: ").append(orgName);
                if (reqTitle != null) summary.append(" | Req: ").append(reqTitle);
                if (regName != null) summary.append(regInfo);
                summary.append(periodInfo);
                summary.append(dateInfo);
                summary.append(commentInfo);
                summary.append(" | Details: ").append(snippet.replace("\n", " "));

                if (seenIds.add(sub.getId().toString())) {
                    refs.add(AssistantQueryResponse.DocumentReference.builder()
                            .type("Submission")
                            .id(sub.getId().toString())
                            .title(statusStr + " — " + (orgName != null ? orgName : "N/A") + " / " + (reqTitle != null ? reqTitle : "N/A"))
                            .summary(summary.toString())
                            .build());
                }
            }
            if (!subs.isEmpty() && !parts.stream().anyMatch(p -> p.contains("submission"))) {
                parts.add("**" + subs.size() + " submission document(s)** matched.");
            }
        } catch (Exception e) {
            log.warn("Submission search failed: {}", e.getMessage());
        }
    }

    private void searchEvidence(String query, List<AssistantQueryResponse.DocumentReference> refs, List<String> parts, List<String> hexHashes, Set<String> seenIds) {
        try {
            List<Evidence> evs = new ArrayList<>();
            for (String hash : hexHashes) {
                try {
                    List<Evidence> found = evidenceRepository.searchByFileHash(hash);
                    evs.addAll(found);
                } catch (Exception ignored) {}
                if (!evs.isEmpty()) break;
            }
            if (evs.isEmpty()) {
                evs = evidenceRepository.searchByExtractedText(query);
            }
            for (Evidence ev : evs) {
                if (seenIds.add(ev.getId().toString())) {
                    String snippet = ev.getExtractedText() != null
                            ? ev.getExtractedText().substring(0, Math.min(ev.getExtractedText().length(), 200))
                            : "No extracted text";
                    String hashInfo = ev.getFileHash() != null ? " | SHA-256: " + ev.getFileHash().substring(0, 16) + "..." : "";
                    refs.add(AssistantQueryResponse.DocumentReference.builder()
                            .type("Evidence")
                            .id(ev.getId().toString())
                            .title(ev.getDocumentName() != null ? ev.getDocumentName() : "Evidence #" + ev.getId().toString().substring(0, 8))
                            .summary("File: " + (ev.getFileName() != null ? ev.getFileName() : "N/A")
                                    + " | Status: " + (ev.getExpiryStatus() != null ? ev.getExpiryStatus() : "N/A")
                                    + hashInfo
                                    + " | Content: " + snippet.replace("\n", " "))
                            .build());
                }
            }
            if (!evs.isEmpty() && !parts.stream().anyMatch(p -> p.contains("evidence"))) {
                parts.add("**" + evs.size() + " evidence document(s)** matched.");
            }
        } catch (Exception e) {
            log.warn("Evidence search failed: {}", e.getMessage());
        }
    }

    private String buildAnswer(String query, List<String> parts, List<AssistantQueryResponse.DocumentReference> refs) {
        if (refs.isEmpty()) {
            // Gather overall compliance health for a contextual response
            StringBuilder sb = new StringBuilder();
            sb.append("I could not find exact keyword matches for \"").append(query).append("\".\n\n");
            sb.append("Here is your current compliance overview:\n\n");

            try {
                List<ComplianceRecord> allRecords = complianceRecordRepository.findAll();
                long total = allRecords.size();
                long compliant = allRecords.stream().filter(r -> r.getStatus() == com.rura.regtech.entity.enums.ComplianceStatus.COMPLIANT).count();
                long nonCompliant = allRecords.stream().filter(r -> r.getStatus() == com.rura.regtech.entity.enums.ComplianceStatus.NON_COMPLIANT).count();
                long pending = allRecords.stream().filter(r -> r.getStatus() == com.rura.regtech.entity.enums.ComplianceStatus.PENDING).count();
                long submitted = allRecords.stream().filter(r -> r.getStatus() == com.rura.regtech.entity.enums.ComplianceStatus.SUBMITTED).count();

                sb.append("**Compliance Records:** ").append(total).append(" total");
                if (total > 0) {
                    sb.append(" (").append(compliant).append(" compliant, ").append(nonCompliant).append(" non-compliant, ")
                            .append(pending).append(" pending, ").append(submitted).append(" submitted)");
                }
                sb.append("\n");

                if (nonCompliant > 0) {
                    sb.append("⚠️ You have **").append(nonCompliant).append(" non-compliant record(s)** that need immediate attention.\n");
                }
                if (pending > 0 || submitted > 0) {
                    sb.append("⏳ **").append(pending + submitted).append(" record(s)** are awaiting review or action.\n");
                }

                List<Evidence> expiringEvidence = evidenceRepository.findByExpiryStatus(Evidence.ExpiryStatus.EXPIRING_SOON);
                if (!expiringEvidence.isEmpty()) {
                    sb.append("⚠️ **").append(expiringEvidence.size()).append(" evidence document(s)** are expiring soon.\n");
                }

                List<Submission> draftSubs = submissionRepository.findByStatus(com.rura.regtech.entity.enums.SubmissionStatus.DRAFT);
                if (!draftSubs.isEmpty()) {
                    sb.append("📝 You have **").append(draftSubs.size()).append(" draft submission(s)** that have not been submitted.\n");
                }

                if (total == 0) {
                    sb.append("No compliance records exist yet. Initialize compliance to get started.\n");
                }
            } catch (Exception e) {
                log.warn("Failed to build compliance overview: {}", e.getMessage());
            }

            sb.append("\n**Tip:** Try searching for a specific organization name, regulation title, or document keyword for more targeted results.");
            return sb.toString();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Here is what I found for \"").append(query).append("\":\n\n");

        long orgCount = refs.stream().filter(r -> "Organization".equals(r.getType())).count();
        long reqCount = refs.stream().filter(r -> "Requirement".equals(r.getType())).count();
        long regCount = refs.stream().filter(r -> "Regulation".equals(r.getType())).count();
        long recCount = refs.stream().filter(r -> "Compliance Record".equals(r.getType())).count();
        long subCount = refs.stream().filter(r -> "Submission".equals(r.getType())).count();
        long evCount = refs.stream().filter(r -> "Evidence".equals(r.getType())).count();

        sb.append("**Summary:** ");
        List<String> counts = new ArrayList<>();
        if (orgCount > 0) counts.add(orgCount + " organization(s)");
        if (reqCount > 0) counts.add(reqCount + " requirement(s)");
        if (regCount > 0) counts.add(regCount + " regulation(s)");
        if (recCount > 0) counts.add(recCount + " compliance record(s)");
        if (subCount > 0) counts.add(subCount + " submission(s)");
        if (evCount > 0) counts.add(evCount + " evidence document(s)");
        sb.append(String.join(", ", counts)).append("\n\n");

        for (String part : parts) {
            sb.append("• ").append(part).append("\n");
        }

        sb.append("\nTotal **").append(refs.size()).append("** matching item(s) found. See references below for details.");

        return sb.toString();
    }
}
