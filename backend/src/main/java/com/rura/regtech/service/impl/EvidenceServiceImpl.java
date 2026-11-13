package com.rura.regtech.service.impl;

import com.rura.regtech.dto.request.EvidenceRequest;
import com.rura.regtech.dto.response.EvidenceResponse;
import com.rura.regtech.dto.response.ExtractedData;
import com.rura.regtech.entity.*;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.entity.enums.EvidenceDocumentType;
import com.rura.regtech.entity.enums.SubmissionStatus;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.ComplianceRecordRepository;
import com.rura.regtech.repository.ComplianceRequirementRepository;
import com.rura.regtech.repository.EvidenceRepository;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.repository.SubmissionRepository;
import com.rura.regtech.repository.UserRepository;
import com.rura.regtech.service.AiExtractionService;
import com.rura.regtech.service.EvidenceService;
import com.rura.regtech.service.NotificationService;
import com.rura.regtech.service.OcrService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EvidenceServiceImpl implements EvidenceService {

    private final EvidenceRepository evidenceRepository;
    private final OrganizationRepository organizationRepository;
    private final ComplianceRecordRepository complianceRecordRepository;
    private final ComplianceRequirementRepository complianceRequirementRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final OcrService ocrService;
    private final AiExtractionService aiExtractionService;
    private final com.rura.regtech.service.ComplianceStateMachineService stateMachineService;

    @Value("${app.upload.dir:uploads/evidence}")
    private String uploadDir;

    private static final int EXPIRY_WARNING_DAYS = 30;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(uploadDir));
        } catch (IOException e) {
            log.warn("Could not create upload directory: {}", uploadDir);
        }
    }

    @Override
    @Transactional
    public EvidenceResponse createEvidence(EvidenceRequest request) {
        Organization organization = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        Evidence.EvidenceBuilder builder = Evidence.builder()
                .organization(organization)
                .documentName(request.getDocumentName())
                .documentType(request.getDocumentType())
                .documentNumber(request.getDocumentNumber())
                .issuer(request.getIssuer())
                .issueDate(request.getIssueDate())
                .expiryDate(request.getExpiryDate())
                .fileUrl(request.getFileUrl())
                .fileHash(request.getFileHash())
                .fileName(request.getFileName())
                .fileSize(request.getFileSize())
                .notes(request.getNotes());

        if (request.getRequirementId() != null) {
            ComplianceRequirement requirement = complianceRequirementRepository.findById(request.getRequirementId())
                    .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + request.getRequirementId()));
            builder.requirement(requirement);
        }

        if (request.getSubmissionId() != null) {
            Submission submission = submissionRepository.findById(request.getSubmissionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + request.getSubmissionId()));
            builder.submission(submission);
        }

        Evidence evidence = builder.build();

        updateExpiryStatus(evidence);

        evidence = evidenceRepository.save(evidence);

        log.info("Created evidence {} for organization {}", evidence.getId(), organization.getId());

        if (evidence.getExpiryStatus() == Evidence.ExpiryStatus.EXPIRED) {
            try {
                notifyExpiredEvidence(evidence);
            } catch (Exception e) {
                log.error("Failed to send expiry notification for evidence {}", evidence.getId(), e);
            }
        } else if (evidence.getExpiryStatus() == Evidence.ExpiryStatus.EXPIRING_SOON) {
            try {
                notifyExpiringSoonEvidence(evidence);
            } catch (Exception e) {
                log.error("Failed to send expiry notification for evidence {}", evidence.getId(), e);
            }
        }

        return mapToResponse(evidence);
    }

    @Override
    @Transactional
    public EvidenceResponse createEvidenceWithFile(EvidenceRequest request, MultipartFile file) {
        Organization organization = organizationRepository.findById(request.getOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        String fileName = file.getOriginalFilename();
        String fileHash = computeHash(file);
        String storedPath = storeFile(file, organization.getId());

        Evidence.EvidenceBuilder builder = Evidence.builder()
                .organization(organization)
                .documentName(request.getDocumentName() != null ? request.getDocumentName() : fileName)
                .documentType(request.getDocumentType() != null ? request.getDocumentType() : EvidenceDocumentType.OTHER)
                .documentNumber(request.getDocumentNumber())
                .issuer(request.getIssuer())
                .issueDate(request.getIssueDate())
                .expiryDate(request.getExpiryDate())
                .fileUrl(storedPath)
                .fileHash(fileHash)
                .fileName(fileName)
                .fileSize(file.getSize())
                .notes(request.getNotes());

        if (request.getRequirementId() != null) {
            ComplianceRequirement requirement = complianceRequirementRepository.findById(request.getRequirementId())
                    .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + request.getRequirementId()));
            builder.requirement(requirement);
        }

        if (request.getSubmissionId() != null) {
            Submission submission = submissionRepository.findById(request.getSubmissionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + request.getSubmissionId()));
            builder.submission(submission);
        }

        Evidence evidence = builder.build();
        updateExpiryStatus(evidence);

        List<ComplianceRequirement> matchedReqs = java.util.Collections.emptyList();
        try {
            byte[] fileBytes = file.getBytes();
            String ocrText = ocrService.extractText(fileBytes, fileName);
            evidence.setExtractedText(ocrText);
            if (!ocrText.isEmpty()) {
                ExtractedData extracted = aiExtractionService.extract(ocrText, fileName);
                evidence.setExtractedCompanyName(extracted.getCompanyName());
                evidence.setExtractedComplianceStatus(extracted.getComplianceStatus());
                evidence.setDocumentSummary(extracted.getSummary());
                evidence.setExtractedDocumentNumber(extracted.getDocumentNumber());
                evidence.setExtractedIssuingAuthority(extracted.getIssuingAuthority());
                evidence.setExtractedIssueDate(extracted.getIssueDate());
                evidence.setExtractedFullName(extracted.getFullName());
                evidence.setExtractedAddress(extracted.getAddress());
                evidence.setExtractedDocumentType(extracted.getDocumentType());
                evidence.setAiProcessed(true);

                if (extracted.getExpiryDate() != null && evidence.getExpiryDate() == null) {
                    try {
                        LocalDate extractedDate = LocalDate.parse(extracted.getExpiryDate());
                        evidence.setExpiryDate(extractedDate);
                        updateExpiryStatus(evidence);
                    } catch (Exception e) {
                        log.warn("Could not parse extracted expiry date: {}", extracted.getExpiryDate());
                    }
                }

                if (extracted.getCompanyName() != null && evidence.getIssuer() == null) {
                    evidence.setIssuer(extracted.getCompanyName());
                }

                // Auto-match to requirement if not already set
                if (evidence.getRequirement() == null) {
                    matchedReqs = findMatchingRequirements(extracted, organization, evidence.getDocumentName());
                    if (!matchedReqs.isEmpty()) {
                        evidence.setRequirement(matchedReqs.get(0));
                    }
                }

                log.info("AI extracted data for evidence: company={}, status={}, expiry={}",
                        extracted.getCompanyName(), extracted.getComplianceStatus(), extracted.getExpiryDate());
            } else {
                log.info("No OCR text extracted from file: {}", fileName);
            }
        } catch (Exception e) {
            log.warn("OCR/AI extraction failed for {}: {}", fileName, e.getMessage());
        }

        evidence = evidenceRepository.save(evidence);

        log.info("Created evidence with file {} for organization {}", evidence.getId(), organization.getId());

        linkEvidenceToComplianceAndSubmission(evidence, organization);

        if (matchedReqs.size() > 1) {
            for (int i = 1; i < matchedReqs.size(); i++) {
                ComplianceRequirement req = matchedReqs.get(i);
                Evidence additionalEvidence = Evidence.builder()
                        .organization(evidence.getOrganization())
                        .documentName(evidence.getDocumentName())
                        .documentType(evidence.getDocumentType())
                        .documentNumber(evidence.getDocumentNumber())
                        .issuer(evidence.getIssuer())
                        .issueDate(evidence.getIssueDate())
                        .expiryDate(evidence.getExpiryDate())
                        .fileUrl(evidence.getFileUrl())
                        .fileHash(evidence.getFileHash())
                        .fileName(evidence.getFileName())
                        .fileSize(evidence.getFileSize())
                        .notes(evidence.getNotes())
                        .extractedText(evidence.getExtractedText())
                        .extractedCompanyName(evidence.getExtractedCompanyName())
                        .extractedComplianceStatus(evidence.getExtractedComplianceStatus())
                        .documentSummary(evidence.getDocumentSummary())
                        .extractedDocumentNumber(evidence.getExtractedDocumentNumber())
                        .extractedIssuingAuthority(evidence.getExtractedIssuingAuthority())
                        .extractedIssueDate(evidence.getExtractedIssueDate())
                        .extractedFullName(evidence.getExtractedFullName())
                        .extractedAddress(evidence.getExtractedAddress())
                        .extractedDocumentType(evidence.getExtractedDocumentType())
                        .aiProcessed(evidence.getAiProcessed())
                        .expiryStatus(evidence.getExpiryStatus())
                        .daysUntilExpiry(evidence.getDaysUntilExpiry())
                        .requirement(req)
                        .build();

                additionalEvidence = evidenceRepository.save(additionalEvidence);
                log.info("Created additional matched evidence {} for organization {} and requirement {}", 
                        additionalEvidence.getId(), organization.getId(), req.getId());
                linkEvidenceToComplianceAndSubmission(additionalEvidence, organization);
            }
        }

        return mapToResponse(evidence);
    }

    @Override
    @Transactional
    public EvidenceResponse runAiExtraction(UUID id) {
        Evidence evidence = evidenceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found: " + id));

        if (evidence.getFileUrl() == null) {
            throw new IllegalStateException("Evidence has no file to extract from");
        }

        try {
            Path filePath = Paths.get(evidence.getFileUrl());
            if (!Files.exists(filePath)) {
                log.warn("File not found for evidence {}: {}", id, evidence.getFileUrl());
                return mapToResponse(evidence);
            }

            byte[] fileBytes = Files.readAllBytes(filePath);
            String ocrText = ocrService.extractText(fileBytes, evidence.getFileName());
            evidence.setExtractedText(ocrText);

            if (!ocrText.isEmpty()) {
                ExtractedData extracted = aiExtractionService.extract(ocrText, evidence.getFileName());
                evidence.setExtractedCompanyName(extracted.getCompanyName());
                evidence.setExtractedComplianceStatus(extracted.getComplianceStatus());
                evidence.setDocumentSummary(extracted.getSummary());
                evidence.setExtractedDocumentNumber(extracted.getDocumentNumber());
                evidence.setExtractedIssuingAuthority(extracted.getIssuingAuthority());
                evidence.setExtractedIssueDate(extracted.getIssueDate());
                evidence.setExtractedFullName(extracted.getFullName());
                evidence.setExtractedAddress(extracted.getAddress());
                evidence.setExtractedDocumentType(extracted.getDocumentType());
                evidence.setAiProcessed(true);

                if (extracted.getExpiryDate() != null) {
                    try {
                        LocalDate extractedDate = LocalDate.parse(extracted.getExpiryDate());
                        evidence.setExpiryDate(extractedDate);
                        updateExpiryStatus(evidence);
                    } catch (Exception e) {
                        log.warn("Could not parse extracted expiry date: {}", extracted.getExpiryDate());
                    }
                }

                // Auto-match to requirement if not already set
                Organization org = evidence.getOrganization();
                List<ComplianceRequirement> matchedReqs = java.util.Collections.emptyList();
                if (evidence.getRequirement() == null && org != null) {
                    matchedReqs = findMatchingRequirements(extracted, org, evidence.getDocumentName());
                    if (!matchedReqs.isEmpty()) {
                        evidence.setRequirement(matchedReqs.get(0));
                    }
                }

                evidence = evidenceRepository.save(evidence);
                log.info("AI re-extraction completed for evidence {}", id);

                // Create compliance record + submission if requirement was matched
                if (evidence.getRequirement() != null) {
                    linkEvidenceToComplianceAndSubmission(evidence, org);
                }

                if (matchedReqs.size() > 1 && org != null) {
                    for (int i = 1; i < matchedReqs.size(); i++) {
                        ComplianceRequirement req = matchedReqs.get(i);
                        Evidence additionalEvidence = Evidence.builder()
                                .organization(evidence.getOrganization())
                                .documentName(evidence.getDocumentName())
                                .documentType(evidence.getDocumentType())
                                .documentNumber(evidence.getDocumentNumber())
                                .issuer(evidence.getIssuer())
                                .issueDate(evidence.getIssueDate())
                                .expiryDate(evidence.getExpiryDate())
                                .fileUrl(evidence.getFileUrl())
                                .fileHash(evidence.getFileHash())
                                .fileName(evidence.getFileName())
                                .fileSize(evidence.getFileSize())
                                .notes(evidence.getNotes())
                                .extractedText(evidence.getExtractedText())
                                .extractedCompanyName(evidence.getExtractedCompanyName())
                                .extractedComplianceStatus(evidence.getExtractedComplianceStatus())
                                .documentSummary(evidence.getDocumentSummary())
                                .extractedDocumentNumber(evidence.getExtractedDocumentNumber())
                                .extractedIssuingAuthority(evidence.getExtractedIssuingAuthority())
                                .extractedIssueDate(evidence.getExtractedIssueDate())
                                .extractedFullName(evidence.getExtractedFullName())
                                .extractedAddress(evidence.getExtractedAddress())
                                .extractedDocumentType(evidence.getExtractedDocumentType())
                                .aiProcessed(evidence.getAiProcessed())
                                .expiryStatus(evidence.getExpiryStatus())
                                .daysUntilExpiry(evidence.getDaysUntilExpiry())
                                .requirement(req)
                                .build();

                        additionalEvidence = evidenceRepository.save(additionalEvidence);
                        log.info("Re-extraction: Created additional matched evidence {} for requirement {}", additionalEvidence.getId(), req.getId());
                        linkEvidenceToComplianceAndSubmission(additionalEvidence, org);
                    }
                }
            }
        } catch (IOException e) {
            log.warn("Could not read file for AI extraction: {}", e.getMessage());
        }

        return mapToResponse(evidence);
    }

    @Override
    @Transactional
    public EvidenceResponse updateEvidence(UUID id, EvidenceRequest request) {
        Evidence evidence = evidenceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found: " + id));

        if (request.getDocumentName() != null) evidence.setDocumentName(request.getDocumentName());
        if (request.getDocumentType() != null) evidence.setDocumentType(request.getDocumentType());
        if (request.getDocumentNumber() != null) evidence.setDocumentNumber(request.getDocumentNumber());
        if (request.getIssuer() != null) evidence.setIssuer(request.getIssuer());
        if (request.getIssueDate() != null) evidence.setIssueDate(request.getIssueDate());
        if (request.getExpiryDate() != null) evidence.setExpiryDate(request.getExpiryDate());
        if (request.getFileUrl() != null) evidence.setFileUrl(request.getFileUrl());
        if (request.getFileHash() != null) evidence.setFileHash(request.getFileHash());
        if (request.getFileName() != null) evidence.setFileName(request.getFileName());
        if (request.getFileSize() != null) evidence.setFileSize(request.getFileSize());
        if (request.getNotes() != null) evidence.setNotes(request.getNotes());

        if (request.getRequirementId() != null) {
            ComplianceRequirement requirement = complianceRequirementRepository.findById(request.getRequirementId())
                    .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + request.getRequirementId()));
            evidence.setRequirement(requirement);
        }

        updateExpiryStatus(evidence);

        evidence = evidenceRepository.save(evidence);

        linkEvidenceToComplianceAndSubmission(evidence, evidence.getOrganization());

        log.info("Updated evidence {}", id);

        return mapToResponse(evidence);
    }

    @Override
    public EvidenceResponse getEvidence(UUID id) {
        Evidence evidence = evidenceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found: " + id));
        return mapToResponse(evidence);
    }

    private void linkEvidenceToComplianceAndSubmission(Evidence evidence, Organization organization) {
        if (evidence.getRequirement() == null) return;
        try {
            UUID orgId = organization.getId();
            String sector = organization.getSector();
            List<ComplianceRequirement> allReqs;
            if (sector != null) {
                allReqs = complianceRequirementRepository.findByRegulationSector(sector);
            } else {
                allReqs = List.of(evidence.getRequirement());
            }

            for (ComplianceRequirement req : allReqs) {
                boolean isDirectRequirement = evidence.getRequirement() != null && evidence.getRequirement().getId().equals(req.getId());
                double aiScore = computeEvidenceScore(evidence, req);

                // Always link to the directly-linked requirement even if score is low.
                // For additional sector-matched requirements, apply the threshold.
                if (!isDirectRequirement && aiScore < 40) continue;

                ComplianceRecord record = complianceRecordRepository
                        .findByOrganizationIdAndRequirementId(orgId, req.getId())
                        .orElseGet(() -> {
                            ComplianceRecord newRecord = ComplianceRecord.builder()
                                    .organization(organization)
                                    .requirement(req)
                                    .status(ComplianceStatus.SUBMITTED)
                                    .complianceScore(0.0)
                                    .reportingPeriodStart(LocalDate.now())
                                    .reportingPeriodEnd(LocalDate.now().plusMonths(1))
                                    .build();
                            return complianceRecordRepository.save(newRecord);
                        });
                if (record.getStatus() == ComplianceStatus.PENDING) {
                    stateMachineService.transitionStatus(record.getId(), ComplianceStatus.SUBMITTED);
                }

                complianceRecordRepository.save(record);
                log.info("Compliance record {} status = {} score = {} after evidence link for req {}", record.getId(), record.getStatus(), record.getComplianceScore(), req.getTitle());

                // Check if this compliance record already has a submission
                boolean recordHasSubmission = !submissionRepository.findByComplianceRecordId(record.getId()).isEmpty();
                if (!recordHasSubmission) {
                    User submitter = com.rura.regtech.config.SecurityUtils.getCurrentUserId() != null
                            ? userRepository.findById(com.rura.regtech.config.SecurityUtils.getCurrentUserId()).orElse(null) : null;
                    if (submitter == null) {
                        submitter = userRepository.findByOrganizationId(orgId)
                                .stream().findFirst().orElse(null);
                    }
                    if (submitter == null) {
                        // Fallback: use any user in the system
                        submitter = userRepository.findAll().stream().findFirst().orElse(null);
                    }
                    if (submitter != null) {
                        Submission submission = Submission.builder()
                                .complianceRecord(record)
                                .submittedBy(submitter)
                                .status(SubmissionStatus.SUBMITTED)
                                .submissionDate(LocalDateTime.now())
                                .evidenceUrl(evidence.getFileUrl())
                                .fileHash(evidence.getFileHash())
                                .extractedText(evidence.getExtractedText())
                                .documentSummary(evidence.getDocumentSummary())
                                .aiAnalysisStatus(evidence.getAiProcessed() ? "AI_PROCESSED" : "PENDING_REVIEW")
                                .build();
                        submissionRepository.save(submission);
                        log.info("Created submission for compliance record {} from evidence {}", record.getId(), evidence.getId());
                    }
                }
            }

            // Link evidence to the submission for its directly-linked requirement's compliance record
            if (evidence.getSubmission() == null) {
                complianceRecordRepository.findByOrganizationIdAndRequirementId(orgId, evidence.getRequirement().getId())
                    .ifPresent(rec -> submissionRepository.findByComplianceRecordId(rec.getId())
                        .stream().findFirst().ifPresent(sub -> {
                            evidence.setSubmission(sub);
                            evidenceRepository.save(evidence);
                        }));
            }
        } catch (Exception e) {
            log.warn("Failed to link evidence to compliance/submission: {}", e.getMessage());
        }
    }

    private double computeEvidenceScore(Evidence evidence, ComplianceRequirement requirement) {
        String ocrText = evidence.getExtractedText();
        if (ocrText == null || ocrText.isBlank()) {
            // Try to read from file
            try {
                if (evidence.getFileUrl() != null) {
                    java.nio.file.Path filePath = java.nio.file.Paths.get(evidence.getFileUrl());
                    if (java.nio.file.Files.exists(filePath)) {
                        byte[] fileBytes = java.nio.file.Files.readAllBytes(filePath);
                        ocrText = ocrService.extractText(fileBytes, evidence.getFileName());
                    }
                }
            } catch (Exception e) {
                log.warn("Could not read file for scoring: {}", e.getMessage());
            }
        }
        if (ocrText == null || ocrText.isBlank()) return 0.0;

        String reqTitle = requirement.getTitle() != null ? requirement.getTitle() : "";
        String reqDesc = requirement.getDescription() != null ? requirement.getDescription() : "";
        String fileName = evidence.getFileName() != null ? evidence.getFileName() : evidence.getDocumentName();

        return aiExtractionService.evaluateComplianceScore(ocrText, reqTitle, reqDesc, fileName);
    }

    private double scoreForStatus(ComplianceStatus status) {
        switch (status) {
            case COMPLIANT: return 100.0;
            case WAIVED: return 100.0;
            case SUBMITTED: return 75.0;
            case UNDER_REVIEW: return 50.0;
            case NON_COMPLIANT: return 0.0;
            case PENDING: return 0.0;
            default: return 0.0;
        }
    }

    private List<ComplianceRequirement> findMatchingRequirements(ExtractedData extracted, Organization organization, String documentName) {
        List<ComplianceRequirement> matched = new java.util.ArrayList<>();
        String sector = organization.getSector();
        if (sector == null || sector.isBlank()) return matched;

        List<ComplianceRequirement> requirements = complianceRequirementRepository.findByRegulationSector(sector);
        if (requirements.isEmpty()) return matched;

        String docName = documentName != null ? documentName.toLowerCase().replaceAll("[^a-z0-9\\s]", " ") : "";
        String extType = extracted.getDocumentType() != null ? extracted.getDocumentType().toLowerCase() : "";
        String extSummary = extracted.getSummary() != null ? extracted.getSummary().toLowerCase() : "";
        String extAuthority = extracted.getIssuingAuthority() != null ? extracted.getIssuingAuthority().toLowerCase() : "";

        java.util.Set<String> noiseWords = new java.util.HashSet<>(java.util.Arrays.asList("the", "and", "for", "from", "this", "that", "with", "can", "are", "was", "has", "not", "but", "all", "any", "our", "its", "may", "canalbox", "rural", "pdf", "txt"));
        List<String> docWords = new java.util.ArrayList<>();
        for (String word : docName.split("\\s+")) {
            if (word.length() > 2 && !noiseWords.contains(word)) {
                docWords.add(word);
            }
        }

        Set<String> docPhrases = new java.util.HashSet<>();
        for (int i = 0; i < docWords.size(); i++) {
            docPhrases.add(docWords.get(i));
            for (int j = i + 1; j < Math.min(i + 3, docWords.size()); j++) {
                docPhrases.add(docWords.get(i) + " " + docWords.get(j));
            }
        }

        for (ComplianceRequirement req : requirements) {
            String reqTitle = req.getTitle() != null ? req.getTitle().toLowerCase() : "";
            String reqDesc = req.getDescription() != null ? req.getDescription().toLowerCase() : "";
            int score = 0;

            for (String phrase : docPhrases) {
                if (phrase.split(" ").length == 3 && reqTitle.contains(phrase)) {
                    score += 3;
                }
            }

            for (String phrase : docPhrases) {
                if (phrase.split(" ").length == 2 && reqTitle.contains(phrase)) {
                    score += 3;
                }
            }

            for (String word : docWords) {
                if (reqTitle.contains(word)) {
                    score += 2;
                }
            }

            if (!extType.isEmpty() && reqTitle.contains(extType)) {
                score += 2;
            }

            if (!extSummary.isEmpty() && !reqDesc.isEmpty()) {
                for (String word : extSummary.split("\\s+")) {
                    if (word.length() > 4 && reqDesc.contains(word)) {
                        score += 1;
                    }
                }
            }

            if (score >= 3) {
                log.info("Requirement '{}' matched document '{}' with score {}", req.getTitle(), documentName, score);
                matched.add(req);
            }
        }
        return matched;
    }

    @Override
    @Transactional
    public void reconcileAllEvidence(UUID organizationId) {
        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));

        // Step 1: Match unlinked evidence to requirements
        List<Evidence> unlinked = evidenceRepository.findByOrganizationId(organizationId).stream()
                .filter(e -> e.getRequirement() == null && e.getAiProcessed() && e.getExtractedText() != null)
                .collect(Collectors.toList());
        for (Evidence evidence : unlinked) {
            ExtractedData extracted = new ExtractedData();
            extracted.setDocumentType(evidence.getExtractedDocumentType());
            extracted.setCompanyName(evidence.getExtractedCompanyName());
            extracted.setSummary(evidence.getDocumentSummary());
            extracted.setIssuingAuthority(evidence.getExtractedIssuingAuthority());
            extracted.setDocumentNumber(evidence.getExtractedDocumentNumber());
            
            List<ComplianceRequirement> matchedReqs = findMatchingRequirements(extracted, org, evidence.getDocumentName());
            if (!matchedReqs.isEmpty()) {
                evidence.setRequirement(matchedReqs.get(0));
                evidenceRepository.save(evidence);
                log.info("Reconciled evidence {} -> requirement {}", evidence.getId(), evidence.getRequirement().getId());

                if (matchedReqs.size() > 1) {
                    for (int i = 1; i < matchedReqs.size(); i++) {
                        ComplianceRequirement req = matchedReqs.get(i);
                        Evidence additionalEvidence = Evidence.builder()
                                .organization(evidence.getOrganization())
                                .documentName(evidence.getDocumentName())
                                .documentType(evidence.getDocumentType())
                                .documentNumber(evidence.getDocumentNumber())
                                .issuer(evidence.getIssuer())
                                .issueDate(evidence.getIssueDate())
                                .expiryDate(evidence.getExpiryDate())
                                .fileUrl(evidence.getFileUrl())
                                .fileHash(evidence.getFileHash())
                                .fileName(evidence.getFileName())
                                .fileSize(evidence.getFileSize())
                                .notes(evidence.getNotes())
                                .extractedText(evidence.getExtractedText())
                                .extractedCompanyName(evidence.getExtractedCompanyName())
                                .extractedComplianceStatus(evidence.getExtractedComplianceStatus())
                                .documentSummary(evidence.getDocumentSummary())
                                .extractedDocumentNumber(evidence.getExtractedDocumentNumber())
                                .extractedIssuingAuthority(evidence.getExtractedIssuingAuthority())
                                .extractedIssueDate(evidence.getExtractedIssueDate())
                                .extractedFullName(evidence.getExtractedFullName())
                                .extractedAddress(evidence.getExtractedAddress())
                                .extractedDocumentType(evidence.getExtractedDocumentType())
                                .aiProcessed(evidence.getAiProcessed())
                                .expiryStatus(evidence.getExpiryStatus())
                                .daysUntilExpiry(evidence.getDaysUntilExpiry())
                                .requirement(req)
                                .build();

                        additionalEvidence = evidenceRepository.save(additionalEvidence);
                        log.info("Reconciled additional matched evidence {} -> requirement {}", additionalEvidence.getId(), req.getId());
                    }
                }
            }
        }

        // Step 2: For evidence with requirement but no compliance record, create one
        // For evidence with requirement but no submission, create one
        List<Evidence> allLinked = evidenceRepository.findByOrganizationId(organizationId).stream()
                .filter(e -> e.getRequirement() != null)
                .collect(Collectors.toList());

        for (Evidence evidence : allLinked) {
            ComplianceRequirement req = evidence.getRequirement();

            // Create compliance record if missing
            ComplianceRecord record = complianceRecordRepository
                    .findByOrganizationIdAndRequirementId(organizationId, req.getId())
                    .orElseGet(() -> {
                        double score = computeEvidenceScore(evidence, req);
                        ComplianceRecord newRecord = ComplianceRecord.builder()
                                .organization(org)
                                .requirement(req)
                                .status(ComplianceStatus.SUBMITTED)
                                .complianceScore(score)
                                .reportingPeriodStart(LocalDate.now())
                                .reportingPeriodEnd(LocalDate.now().plusMonths(1))
                                .build();
                        return complianceRecordRepository.save(newRecord);
                    });

            // Update to SUBMITTED if PENDING; set score only if missing
            if (record.getStatus() == ComplianceStatus.PENDING) {
                stateMachineService.transitionStatus(record.getId(), ComplianceStatus.SUBMITTED);
                record.setComplianceScore(computeEvidenceScore(evidence, req));
            } else if (record.getStatus() == ComplianceStatus.SUBMITTED && (record.getComplianceScore() == null || record.getComplianceScore() == 0.0)) {
                record.setComplianceScore(computeEvidenceScore(evidence, req));
            }
            complianceRecordRepository.save(record);

            // Create submission if missing
            if (evidence.getSubmission() == null) {
                List<User> orgUsers = userRepository.findByOrganizationId(organizationId);
                User submitter = orgUsers.isEmpty() ? null : orgUsers.get(0);
                if (submitter != null) {
                    Submission submission = Submission.builder()
                            .complianceRecord(record)
                            .submittedBy(submitter)
                            .status(SubmissionStatus.SUBMITTED)
                            .submissionDate(LocalDateTime.now())
                            .evidenceUrl(evidence.getFileUrl())
                            .fileHash(evidence.getFileHash())
                            .extractedText(evidence.getExtractedText())
                            .documentSummary(evidence.getDocumentSummary())
                            .aiAnalysisStatus(evidence.getAiProcessed() ? "AI_PROCESSED" : "PENDING_REVIEW")
                            .build();
                    Submission savedSub = submissionRepository.save(submission);
                    evidence.setSubmission(savedSub);
                    evidenceRepository.save(evidence);
                    log.info("Reconciliation: created submission {} for evidence {}", savedSub.getId(), evidence.getId());
                }
            }
        }

        // Step 3: Reset compliance records with no matching evidence back to PENDING
        List<ComplianceRecord> submittedRecords = complianceRecordRepository
                .findByOrganizationIdAndStatus(organizationId, ComplianceStatus.SUBMITTED);
        for (ComplianceRecord record : submittedRecords) {
            boolean hasEvidence = allLinked.stream()
                    .anyMatch(e -> e.getRequirement() != null
                            && e.getRequirement().getId().equals(record.getRequirement().getId()));
            if (!hasEvidence) {
                stateMachineService.transitionStatus(record.getId(), ComplianceStatus.PENDING);
                record.setComplianceScore(scoreForStatus(ComplianceStatus.PENDING));
                complianceRecordRepository.save(record);
                log.info("Reconciliation: reset record {} to PENDING (no matching evidence)", record.getId());
            }
        }
    }

    @Override
    public Page<EvidenceResponse> getEvidenceByOrganization(UUID organizationId, String status, String documentType, String search, Pageable pageable) {
        Evidence.ExpiryStatus expiryStatus = null;
        if (status != null && !status.equalsIgnoreCase("ALL")) {
            try {
                expiryStatus = Evidence.ExpiryStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid expiry status: {}", status);
            }
        }

        EvidenceDocumentType docType = null;
        if (documentType != null && !documentType.equalsIgnoreCase("ALL")) {
            try {
                docType = EvidenceDocumentType.valueOf(documentType.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid document type: {}", documentType);
            }
        }

        String searchTerm = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        return evidenceRepository.findByOrganizationAndFilters(
                organizationId,
                expiryStatus != null ? expiryStatus.name() : null,
                docType != null ? docType.name() : null,
                searchTerm, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<EvidenceResponse> getAllEvidence(String status, String documentType, String search, Pageable pageable) {
        Evidence.ExpiryStatus expiryStatus = null;
        if (status != null && !status.equalsIgnoreCase("ALL")) {
            try {
                expiryStatus = Evidence.ExpiryStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid expiry status: {}", status);
            }
        }

        EvidenceDocumentType docType = null;
        if (documentType != null && !documentType.equalsIgnoreCase("ALL")) {
            try {
                docType = EvidenceDocumentType.valueOf(documentType.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid document type: {}", documentType);
            }
        }

        String searchTerm = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        return evidenceRepository.findAllWithFilters(
                expiryStatus != null ? expiryStatus.name() : null,
                docType != null ? docType.name() : null,
                searchTerm, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public List<EvidenceResponse> getExpiringEvidence(UUID organizationId, int daysThreshold) {
        LocalDate thresholdDate = LocalDate.now().plusDays(daysThreshold);
        return evidenceRepository.findByOrganizationIdAndExpiryDateBetween(organizationId, LocalDate.now(), thresholdDate)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<EvidenceResponse> getExpiredEvidence(UUID organizationId) {
        return evidenceRepository.findByOrganizationIdAndExpiryDateBefore(organizationId, LocalDate.now())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadEvidenceBytes(UUID id) {
        Evidence evidence = evidenceRepository.findById(id)
                .orElseThrow(() -> new com.rura.regtech.exception.ResourceNotFoundException("Evidence not found: " + id));
        try {
            java.nio.file.Path filePath = java.nio.file.Paths.get(evidence.getFileUrl());
            if (!java.nio.file.Files.exists(filePath)) {
                throw new com.rura.regtech.exception.ResourceNotFoundException("File not found for evidence: " + id);
            }
            byte[] fileBytes = java.nio.file.Files.readAllBytes(filePath);
            if (evidence.getFileHash() != null) {
                String currentHash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(fileBytes));
                if (!evidence.getFileHash().equalsIgnoreCase(currentHash)) {
                    log.error("File integrity validation failed for evidence {}. Expected hash: {}, calculated hash: {}",
                            id, evidence.getFileHash(), currentHash);
                    throw new IllegalStateException("File integrity validation failed. File may have been tampered with or corrupted.");
                }
            }
            return fileBytes;
        } catch (Exception e) {
            throw new RuntimeException("Failed to read or verify evidence file", e);
        }
    }

    @Override
    @Transactional
    public void deleteEvidence(UUID id) {
        Evidence evidence = evidenceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evidence not found: " + id));
        UUID orgId = evidence.getOrganization() != null ? evidence.getOrganization().getId() : null;
        UUID reqId = evidence.getRequirement() != null ? evidence.getRequirement().getId() : null;

        boolean wasLastForRequirement = false;
        if (orgId != null && reqId != null) {
            List<Evidence> others = evidenceRepository.findByOrganizationIdAndRequirementId(orgId, reqId).stream()
                    .filter(e -> !e.getId().equals(id))
                    .collect(java.util.stream.Collectors.toList());
            if (others.isEmpty()) {
                wasLastForRequirement = true;
            }
        }

        evidenceRepository.delete(evidence);
        log.info("Deleted evidence {}", id);

        if (wasLastForRequirement && orgId != null && reqId != null) {
            complianceRecordRepository.findByOrganizationIdAndRequirementId(orgId, reqId).ifPresent(record -> {
                stateMachineService.transitionStatus(record.getId(), ComplianceStatus.PENDING);
                record.setComplianceScore(0.0);
                complianceRecordRepository.save(record);
                log.info("Reverted compliance record {} to PENDING – last evidence for req {} was deleted", record.getId(), reqId);
            });
        }
    }

    @Override
    @Transactional
    public void processExpiryUpdates() {
        log.info("Starting evidence expiry status update...");

        List<Evidence> allEvidence = evidenceRepository.findExpiringEvidenceOrderedByDate();
        int updated = 0;

        for (Evidence evidence : allEvidence) {
            Evidence.ExpiryStatus oldStatus = evidence.getExpiryStatus();
            updateExpiryStatus(evidence);

            if (!oldStatus.equals(evidence.getExpiryStatus())) {
                evidenceRepository.save(evidence);
                updated++;

                if (evidence.getExpiryStatus() == Evidence.ExpiryStatus.EXPIRED) {
                    try {
                        notifyExpiredEvidence(evidence);
                    } catch (Exception e) {
                        log.error("Failed to send expiry notification for evidence {}", evidence.getId(), e);
                    }
                    log.warn("Evidence {} has EXPIRED: {}", evidence.getDocumentName(), evidence.getExpiryDate());
                } else if (evidence.getExpiryStatus() == Evidence.ExpiryStatus.EXPIRING_SOON) {
                    try {
                        notifyExpiringSoonEvidence(evidence);
                    } catch (Exception e) {
                        log.error("Failed to send expiry notification for evidence {}", evidence.getId(), e);
                    }
                    log.info("Evidence {} is expiring soon: {}", evidence.getDocumentName(), evidence.getExpiryDate());
                }
            }
        }

        log.info("Evidence expiry update complete. Updated {} records.", updated);
    }

    @Override
    public long countExpiredEvidence(UUID organizationId) {
        return evidenceRepository.countExpiredEvidenceByOrganization(organizationId);
    }

    @Override
    public long countExpiringSoonEvidence(UUID organizationId) {
        return evidenceRepository.countExpiringSoonEvidenceByOrganization(organizationId);
    }

    private String storeFile(MultipartFile file, UUID organizationId) {
        try {
            String orgDir = uploadDir + "/" + organizationId;
            Files.createDirectories(Paths.get(orgDir));

            String uniqueName = UUID.randomUUID() + "_" + (file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed");
            Path targetPath = Paths.get(orgDir, uniqueName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            return targetPath.toString();
        } catch (IOException e) {
            log.error("Failed to store file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to store uploaded file: " + file.getOriginalFilename(), e);
        }
    }

    private String computeHash(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            log.warn("Could not compute file hash: {}", e.getMessage());
            return null;
        }
    }

    private void updateExpiryStatus(Evidence evidence) {
        if (evidence.getExpiryDate() == null) {
            evidence.setExpiryStatus(Evidence.ExpiryStatus.NO_EXPIRY);
            evidence.setDaysUntilExpiry(null);
            return;
        }

        LocalDate today = LocalDate.now();
        long daysUntilExpiry = ChronoUnit.DAYS.between(today, evidence.getExpiryDate());
        evidence.setDaysUntilExpiry((int) daysUntilExpiry);

        if (daysUntilExpiry < 0) {
            evidence.setExpiryStatus(Evidence.ExpiryStatus.EXPIRED);
        } else if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
            evidence.setExpiryStatus(Evidence.ExpiryStatus.EXPIRING_SOON);
        } else {
            evidence.setExpiryStatus(Evidence.ExpiryStatus.VALID);
        }
    }

    private void notifyExpiredEvidence(Evidence evidence) {
        List<User> users = userRepository.findByOrganizationId(evidence.getOrganization().getId());
        for (User user : users) {
            notificationService.createNotification(
                    user.getId(),
                    "Evidence Expired: " + evidence.getDocumentName(),
                    String.format("Your %s '%s' (Document #: %s) has expired on %s. Please renew immediately.",
                            evidence.getDocumentType(),
                            evidence.getDocumentName(),
                            evidence.getDocumentNumber() != null ? evidence.getDocumentNumber() : "N/A",
                            evidence.getExpiryDate()),
                    "EXPIRY"
            );
        }
    }

    private void notifyExpiringSoonEvidence(Evidence evidence) {
        List<User> users = userRepository.findByOrganizationId(evidence.getOrganization().getId());
        for (User user : users) {
            notificationService.createNotification(
                    user.getId(),
                    "Evidence Expiring Soon: " + evidence.getDocumentName(),
                    String.format("Your %s '%s' (Document #: %s) expires on %s (%d days remaining). Please renew before it expires.",
                            evidence.getDocumentType(),
                            evidence.getDocumentName(),
                            evidence.getDocumentNumber() != null ? evidence.getDocumentNumber() : "N/A",
                            evidence.getExpiryDate(),
                            evidence.getDaysUntilExpiry()),
                    "EXPIRY"
            );
        }
    }

    private EvidenceResponse mapToResponse(Evidence evidence) {
        EvidenceResponse response = new EvidenceResponse();
        response.setId(evidence.getId());
        response.setOrganizationId(evidence.getOrganization().getId());
        response.setOrganizationName(evidence.getOrganization().getName());
        response.setRequirementId(evidence.getRequirement() != null ? evidence.getRequirement().getId() : null);
        response.setRequirementTitle(evidence.getRequirement() != null ? evidence.getRequirement().getTitle() : null);
        response.setSubmissionId(evidence.getSubmission() != null ? evidence.getSubmission().getId() : null);
        response.setDocumentName(evidence.getDocumentName());
        response.setDocumentType(evidence.getDocumentType());
        response.setDocumentNumber(evidence.getDocumentNumber());
        response.setIssuer(evidence.getIssuer());
        response.setIssueDate(evidence.getIssueDate());
        response.setExpiryDate(evidence.getExpiryDate());
        response.setExpiryStatus(evidence.getExpiryStatus().name());
        response.setDaysUntilExpiry(evidence.getDaysUntilExpiry());
        response.setFileUrl(evidence.getFileUrl());
        response.setFileHash(evidence.getFileHash());
        response.setFileName(evidence.getFileName());
        response.setFileSize(evidence.getFileSize());
        response.setNotes(evidence.getNotes());
        response.setExtractedCompanyName(evidence.getExtractedCompanyName());
        response.setExtractedComplianceStatus(evidence.getExtractedComplianceStatus());
        response.setDocumentSummary(evidence.getDocumentSummary());
        response.setExtractedDocumentNumber(evidence.getExtractedDocumentNumber());
        response.setExtractedIssuingAuthority(evidence.getExtractedIssuingAuthority());
        response.setExtractedIssueDate(evidence.getExtractedIssueDate());
        response.setExtractedFullName(evidence.getExtractedFullName());
        response.setExtractedAddress(evidence.getExtractedAddress());
        response.setExtractedDocumentType(evidence.getExtractedDocumentType());
        response.setAiProcessed(evidence.getAiProcessed());
        response.setCreatedAt(evidence.getCreatedAt());
        response.setUpdatedAt(evidence.getUpdatedAt());
        return response;
    }
}
