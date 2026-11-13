package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.SubmissionResponse;
import com.rura.regtech.entity.ComplianceRecord;
import com.rura.regtech.entity.Submission;
import com.rura.regtech.entity.User;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.entity.enums.RoleName;
import com.rura.regtech.entity.enums.SubmissionStatus;
import com.rura.regtech.exception.ComplianceRuleViolationException;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.exception.UnauthorizedOperationException;
import com.rura.regtech.entity.Evidence;
import com.rura.regtech.entity.enums.EvidenceDocumentType;
import com.rura.regtech.repository.ComplianceRecordRepository;
import com.rura.regtech.repository.EvidenceRepository;
import com.rura.regtech.repository.SubmissionRepository;
import com.rura.regtech.repository.UserRepository;
import com.rura.regtech.dto.response.ExtractedData;
import com.rura.regtech.service.AiExtractionService;
import com.rura.regtech.service.ComplianceTrackingService;
import com.rura.regtech.service.OcrService;
import com.rura.regtech.service.SubmissionService;
import com.rura.regtech.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionServiceImpl implements SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final ComplianceRecordRepository recordRepository;
    private final UserRepository userRepository;
    private final ComplianceTrackingService complianceTrackingService;
    private final com.rura.regtech.service.EventPublisher eventPublisher;
    private final com.rura.regtech.service.OcrService ocrService;
    private final NotificationService notificationService;
    private final com.rura.regtech.service.AiExtractionService aiExtractionService;
    private final EvidenceRepository evidenceRepository;
    private final com.rura.regtech.service.ComplianceStateMachineService stateMachineService;

    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/uploads/evidence/";

    @Override
    @Transactional
    public SubmissionResponse createDraftSubmission(UUID complianceRecordId, UUID userId, String initialComment) {
        log.info("Creating draft submission for record {} by user {}", complianceRecordId, userId);

        ComplianceRecord record = recordRepository.findById(complianceRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance Record not found: " + complianceRecordId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName() == com.rura.regtech.entity.enums.RoleName.ADMIN);
        
        if (!isAdmin && user.getOrganization() != null && record.getOrganization() != null && 
            !user.getOrganization().getId().equals(record.getOrganization().getId())) {
            throw new UnauthorizedOperationException("User does not belong to the organization for this record.");
        }

        Submission submission = Submission.builder()
                .complianceRecord(record)
                .submittedBy(user)
                .status(SubmissionStatus.DRAFT)
                .reviewComment(initialComment)
                .build();

        Submission saved = submissionRepository.save(submission);

        // Publish SUBMISSION_CREATED event
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("recordId", complianceRecordId);
            payload.put("status", "DRAFT");

            eventPublisher.publishSubmissionEvent(
                    com.rura.regtech.event.EventType.SUBMISSION_CREATED,
                    saved.getId(),
                    userId,
                    record.getOrganization().getId(),
                    payload);
        } catch (Exception e) {
            log.error("Failed to publish SUBMISSION_CREATED event", e);
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SubmissionResponse submitComplianceReport(UUID submissionId, UUID userId) {
        log.info("Submitting report {}", submissionId);
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        if (submission.getStatus() != SubmissionStatus.DRAFT) {
            throw new ComplianceRuleViolationException(
                    "Only DRAFT submissions can be submitted. Current status: " + submission.getStatus());
        }

        // Real validation: Check if evidence has been uploaded
        if (submission.getEvidenceUrl() == null || submission.getEvidenceUrl().isEmpty()) {
            throw new ComplianceRuleViolationException("Cannot submit without evidence. Please upload evidence first.");
        }

        // Validate deadline
        validateSubmission(submissionId);

        submission.setStatus(SubmissionStatus.SUBMITTED);
        submission.setSubmissionDate(LocalDateTime.now());

        ComplianceRecord record = submission.getComplianceRecord();
        stateMachineService.transitionStatus(record.getId(), ComplianceStatus.SUBMITTED);
        recordRepository.save(record);

        Submission saved = submissionRepository.save(submission);

        // Create evidence record in evidence locker
        try {
            if (saved.getEvidenceUrl() != null && record.getOrganization() != null) {
                Evidence evidence = Evidence.builder()
                        .organization(record.getOrganization())
                        .requirement(record.getRequirement())
                        .submission(saved)
                        .documentName(java.nio.file.Paths.get(saved.getEvidenceUrl()).getFileName().toString())
                        .documentType(EvidenceDocumentType.OTHER)
                        .fileUrl(saved.getEvidenceUrl())
                        .fileHash(saved.getFileHash())
                        .fileName(java.nio.file.Paths.get(saved.getEvidenceUrl()).getFileName().toString())
                        .fileSize(0L)
                        .extractedText(saved.getExtractedText())
                        .aiProcessed(false)
                        .build();
                evidenceRepository.save(evidence);
                log.info("Evidence record created in locker for submission {}", submissionId);
            }
        } catch (Exception e) {
            log.warn("Failed to create evidence record for submission {}: {}", submissionId, e.getMessage());
        }

        // Run AI analysis on the uploaded evidence
        try {
            runAiAnalysis(saved);
        } catch (Exception e) {
            log.warn("AI analysis failed for submission {}: {}", saved.getId(), e.getMessage());
            saved.setAiAnalysisStatus("AI_ERROR");
            saved.setAiAnalysisDetails("AI analysis failed: " + e.getMessage());
            submissionRepository.save(saved);
        }

        // Publish SUBMISSION_SUBMITTED event
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("recordId", record.getId());
            payload.put("submissionDate", submission.getSubmissionDate().toString());

            eventPublisher.publishSubmissionEvent(
                    com.rura.regtech.event.EventType.SUBMISSION_SUBMITTED,
                    saved.getId(),
                    userId,
                    record.getOrganization().getId(),
                    payload);
        } catch (Exception e) {
            log.error("Failed to publish SUBMISSION_SUBMITTED event", e);
        }

        // Notify Admins and Auditors of new submission
        try {
            String orgName = record.getOrganization() != null ? record.getOrganization().getName() : "An entity";
            String reqTitle = record.getRequirement() != null ? record.getRequirement().getTitle() : "a requirement";
            String notificationMsg = String.format("New compliance report submitted by %s for requirement: %s", orgName, reqTitle);

            // Fetch Admins and Auditors
            java.util.List<User> reviewers = new java.util.ArrayList<>();
            reviewers.addAll(userRepository.findUsersByRoleName(com.rura.regtech.entity.enums.RoleName.ADMIN));
            reviewers.addAll(userRepository.findUsersByRoleName(com.rura.regtech.entity.enums.RoleName.AUDITOR));

            for (User reviewer : reviewers) {
                notificationService.createNotification(
                        reviewer.getId(),
                        "New Submission Received",
                        notificationMsg,
                        "INFO"
                );
            }
        } catch (Exception e) {
            log.error("Failed to send notification for new submission", e);
        }

        return mapToResponse(saved);
    }

    private void runAiAnalysis(Submission submission) {
        runAiAnalysis(submission, true);
    }

    private void runAiAnalysis(Submission submission, boolean updateStatus) {
        String evidenceUrl = submission.getEvidenceUrl();
        if (evidenceUrl == null || evidenceUrl.isEmpty()) {
            if (submission.getExtractedText() == null) submission.setExtractedText("");
            submission.setAiAnalysisStatus("AI_SKIPPED");
            submission.setAiAnalysisDetails("No evidence file to analyze");
            submissionRepository.save(submission);
            return;
        }

        try {
            java.nio.file.Path path = java.nio.file.Paths.get(evidenceUrl);
            byte[] fileBytes = Files.readAllBytes(path);
            String fileName = path.getFileName().toString();

            String ocrText = ocrService.extractText(fileBytes, fileName);
            submission.setExtractedText(ocrText);
            if (ocrText.isEmpty()) {
                submission.setAiAnalysisStatus("AI_SKIPPED");
                submission.setAiAnalysisDetails("Could not extract text from document");
                submissionRepository.save(submission);
                return;
            }

            ExtractedData extracted = aiExtractionService.extract(ocrText, fileName);
            String status = extracted.getComplianceStatus();
            String details = "Extracted: company=" + extracted.getCompanyName()
                    + ", expiry=" + extracted.getExpiryDate()
                    + ", complianceStatus=" + extracted.getComplianceStatus()
                    + ", docType=" + extracted.getDocumentType()
                    + ", docNumber=" + extracted.getDocumentNumber()
                    + ", authority=" + extracted.getIssuingAuthority()
                    + ", issueDate=" + extracted.getIssueDate()
                    + ", personName=" + extracted.getFullName()
                    + ", address=" + extracted.getAddress();

            submission.setAiAnalysisDetails(details);
            submission.setDocumentSummary(extracted.getSummary());

            double evaluatedScore = 0.0;
            if (submission.getComplianceRecord() != null && submission.getComplianceRecord().getRequirement() != null) {
                var req = submission.getComplianceRecord().getRequirement();
                String reqTitle = req.getTitle() != null ? req.getTitle() : "";
                String reqDesc = req.getDescription() != null ? req.getDescription() : "";
                evaluatedScore = aiExtractionService.evaluateComplianceScore(ocrText, reqTitle, reqDesc, fileName);
            }
            submission.setAiScore(evaluatedScore);
            log.info("AI compliance score evaluated for submission {}: {}", submission.getId(), evaluatedScore);

            if (updateStatus) {
                if ("Compliant".equalsIgnoreCase(status) || "Valid".equalsIgnoreCase(status)
                        || "Active".equalsIgnoreCase(status) || "Approved".equalsIgnoreCase(status)) {
                    submission.setAiAnalysisStatus("AI_SUGGESTS_APPROVAL");
                    log.info("AI suggests approval for submission {} — awaiting human review", submission.getId());
                } else if ("Non-Compliant".equalsIgnoreCase(status) || "Invalid".equalsIgnoreCase(status)
                        || "Expired".equalsIgnoreCase(status) || "Rejected".equalsIgnoreCase(status)) {
                    submission.setAiAnalysisStatus("AI_SUGGESTS_REJECTION");
                    submission.setReviewComment("AI analysis indicates: " + status + " — awaiting human review");
                    log.info("AI suggests rejection for submission {} — awaiting human review", submission.getId());
                } else {
                    submission.setAiAnalysisStatus("PENDING_REVIEW");
                    log.info("AI analysis inconclusive for submission {}, marked for review", submission.getId());
                }
            } else {
                // Re-analysis only: populate analysis data without changing submission status
                if ("Compliant".equalsIgnoreCase(status) || "Valid".equalsIgnoreCase(status)
                        || "Active".equalsIgnoreCase(status) || "Approved".equalsIgnoreCase(status)) {
                    submission.setAiAnalysisStatus("AI_SUGGESTS_APPROVAL");
                } else if ("Non-Compliant".equalsIgnoreCase(status) || "Invalid".equalsIgnoreCase(status)
                        || "Expired".equalsIgnoreCase(status) || "Rejected".equalsIgnoreCase(status)) {
                    submission.setAiAnalysisStatus("AI_SUGGESTS_REJECTION");
                } else {
                    submission.setAiAnalysisStatus("PENDING_REVIEW");
                }
                log.info("Re-analysis complete for submission {}, AI status: {}", submission.getId(), submission.getAiAnalysisStatus());
            }
            submissionRepository.save(submission);
        } catch (Exception e) {
            log.warn("AI analysis error for submission {}: {}", submission.getId(), e.getMessage());
            if (submission.getExtractedText() == null) submission.setExtractedText("");
            submission.setAiAnalysisStatus("AI_ERROR");
            submission.setAiAnalysisDetails("Error: " + e.getMessage());
            submissionRepository.save(submission);
        }
    }

    @Override
    @Transactional
    public SubmissionResponse approveSubmission(UUID submissionId, UUID reviewerId, String comment) {
        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found: " + reviewerId));

        boolean isAuthorized = reviewer.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ENTITY || r.getName() == RoleName.ADMIN
                        || r.getName() == RoleName.AUDITOR);

        if (!isAuthorized) {
            throw new UnauthorizedOperationException("User is not authorized to approve submissions.");
        }

        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        if (submission.getStatus() != SubmissionStatus.SUBMITTED) {
            throw new ComplianceRuleViolationException("Can only approve SUBMITTED records.");
        }

        submission.setStatus(SubmissionStatus.APPROVED);
        submission.setReviewComment(comment);

        ComplianceRecord record = submission.getComplianceRecord();
        stateMachineService.transitionStatus(record.getId(), ComplianceStatus.COMPLIANT);
        record.setComplianceScore(100.0);
        recordRepository.save(record);

        // Recalculate score for organization - simplified call for now
        complianceTrackingService.computeComplianceScore(record.getOrganization().getId());

        Submission saved = submissionRepository.save(submission);

        // Publish SUBMISSION_APPROVED event
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("recordId", record.getId());
            payload.put("reviewerId", reviewerId);

            eventPublisher.publishSubmissionEvent(
                    com.rura.regtech.event.EventType.SUBMISSION_APPROVED,
                    saved.getId(),
                    reviewerId,
                    record.getOrganization().getId(),
                    payload);
        } catch (Exception e) {
            log.error("Failed to publish SUBMISSION_APPROVED event", e);
        }

        // Notify submitting user and organization users
        try {
            String reqTitle = record.getRequirement() != null ? record.getRequirement().getTitle() : "a requirement";
            String notificationMsg = String.format("Your compliance report submission for '%s' has been APPROVED. Comment: %s", reqTitle, comment);
            
            // Send to submitting user
            if (submission.getSubmittedBy() != null) {
                notificationService.createNotification(
                        submission.getSubmittedBy().getId(),
                        "Submission Approved",
                        notificationMsg,
                        "INFO"
                );
            }

            // Send to other organization users
            if (record.getOrganization() != null) {
                java.util.List<User> orgUsers = userRepository.findByOrganizationId(record.getOrganization().getId());
                for (User orgUser : orgUsers) {
                    if (submission.getSubmittedBy() == null || !orgUser.getId().equals(submission.getSubmittedBy().getId())) {
                        notificationService.createNotification(
                                orgUser.getId(),
                                "Submission Approved",
                                notificationMsg,
                                "INFO"
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to send notification for submission approval", e);
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SubmissionResponse rejectSubmission(UUID submissionId, UUID reviewerId, String reason) {
        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found: " + reviewerId));

        boolean isAuthorized = reviewer.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.ENTITY || r.getName() == RoleName.ADMIN
                        || r.getName() == RoleName.AUDITOR);

        if (!isAuthorized) {
            throw new UnauthorizedOperationException("User is not authorized to reject submissions.");
        }

        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        if (submission.getStatus() != SubmissionStatus.SUBMITTED) {
            throw new ComplianceRuleViolationException("Can only reject submissions with SUBMITTED status. Current status: " + submission.getStatus());
        }

        submission.setStatus(SubmissionStatus.REJECTED);
        submission.setReviewComment(reason);

        ComplianceRecord record = submission.getComplianceRecord();
        stateMachineService.transitionStatus(record.getId(), ComplianceStatus.NON_COMPLIANT);
        recordRepository.save(record);

        Submission saved = submissionRepository.save(submission);

        // Publish SUBMISSION_REJECTED event
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("recordId", record.getId());
            payload.put("reviewerId", reviewerId);
            payload.put("reason", reason);

            eventPublisher.publishSubmissionEvent(
                    com.rura.regtech.event.EventType.SUBMISSION_REJECTED,
                    saved.getId(),
                    reviewerId,
                    record.getOrganization().getId(),
                    payload);
        } catch (Exception e) {
            log.error("Failed to publish SUBMISSION_REJECTED event", e);
        }

        // Notify submitting user and organization users
        try {
            String reqTitle = record.getRequirement() != null ? record.getRequirement().getTitle() : "a requirement";
            String notificationMsg = String.format("Your compliance report submission for '%s' has been REJECTED. Reason: %s", reqTitle, reason);
            
            // Send to submitting user
            if (submission.getSubmittedBy() != null) {
                notificationService.createNotification(
                        submission.getSubmittedBy().getId(),
                        "Submission Rejected",
                        notificationMsg,
                        "WARNING"
                );
            }

            // Send to other organization users
            if (record.getOrganization() != null) {
                java.util.List<User> orgUsers = userRepository.findByOrganizationId(record.getOrganization().getId());
                for (User orgUser : orgUsers) {
                    if (submission.getSubmittedBy() == null || !orgUser.getId().equals(submission.getSubmittedBy().getId())) {
                        notificationService.createNotification(
                                orgUser.getId(),
                                "Submission Rejected",
                                notificationMsg,
                                "WARNING"
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to send notification for submission rejection", e);
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void uploadEvidence(UUID submissionId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new ComplianceRuleViolationException("Cannot upload empty file.");
        }

        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        try {
            // Ensure directory exists
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename to avoid collisions
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(filename);

            Files.copy(file.getInputStream(), filePath);

            // Generate SHA-256 checksum
            byte[] fileBytes = Files.readAllBytes(filePath);
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = md.digest(fileBytes);
            StringBuilder hashBuilder = new StringBuilder();
            for (byte b : hashBytes) {
                hashBuilder.append(String.format("%02x", b));
            }
            String checksum = hashBuilder.toString();

            submission.setEvidenceUrl(filePath.toString());
            submission.setFileHash(checksum);

            try {
                String ocrText = ocrService.extractText(fileBytes, file.getOriginalFilename());
                submission.setExtractedText(ocrText != null ? ocrText : "");
                if (ocrText != null && !ocrText.isEmpty()) {
                    log.info("OCR extracted {} chars from uploaded evidence for submission {}", ocrText.length(), submissionId);
                }
            } catch (Exception e) {
                log.warn("OCR extraction failed during upload for submission {}: {}", submissionId, e.getMessage());
                submission.setExtractedText("");
            }

            submissionRepository.save(submission);

            log.info("Evidence uploaded for submission {}: {} checksum: {}", submissionId, filePath, checksum.substring(0, 16));

        } catch (IOException | java.security.NoSuchAlgorithmException e) {
            log.error("Failed to upload evidence", e);
            throw new RuntimeException("Failed to store file " + file.getOriginalFilename(), e);
        }
    }

    @Override
    public boolean validateSubmission(UUID submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        // Rule: Submission must have evidence
        // Rule: Submission date must be before deadline (+ grace period)
        if (submission.getComplianceRecord().getReportingPeriodEnd().plusDays(7).isBefore(java.time.LocalDate.now())) {
            // Check if grace period is allowed, or throw rejection
            log.warn("Submission {} is late. Deadline was {}", submissionId,
                    submission.getComplianceRecord().getReportingPeriodEnd());
            throw new ComplianceRuleViolationException("Submission is past the deadline (including grace period).");
        }

        return true;
    }

    @Override
    public String generateSubmissionReceipt(UUID submissionId) {
        return "R-" + submissionId.toString().substring(0, 8).toUpperCase() + "-" + System.currentTimeMillis();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SubmissionResponse> getSubmissionsByComplianceRecord(
            UUID complianceRecordId, Pageable pageable) {
        return submissionRepository.findByComplianceRecordId(complianceRecordId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SubmissionResponse> getAllSubmissions(Pageable pageable) {
        return submissionRepository.findAllWithDetails(pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.core.io.Resource downloadEvidence(UUID submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        
        if (submission.getEvidenceUrl() == null) {
            throw new ResourceNotFoundException("No evidence file for submission: " + submissionId);
        }
        
        try {
            java.nio.file.Path path = java.nio.file.Paths.get(submission.getEvidenceUrl());
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (java.net.MalformedURLException e) {
            throw new RuntimeException("Could not read file: " + e.getMessage());
        }
        
        throw new ResourceNotFoundException("Evidence file not accessible");
    }
    
    @Override
    @Transactional(readOnly = true)
    public byte[] downloadEvidenceBytes(UUID submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));
        
        if (submission.getEvidenceUrl() == null) {
            throw new ResourceNotFoundException("No evidence file for submission: " + submissionId);
        }
        
        try {
            java.nio.file.Path path = java.nio.file.Paths.get(submission.getEvidenceUrl());
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new RuntimeException("Could not read file: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SubmissionResponse> getSubmissionsByOrganization(UUID organizationId, Pageable pageable) {
        return submissionRepository.findByTenantId(organizationId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional
    public SubmissionResponse reAnalyzeSubmission(UUID submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        // Re-run OCR + AI analysis without changing submission status
        runAiAnalysis(submission, false);

        log.info("Re-analysis complete for submission {}", submissionId);
        return mapToResponse(submission);
    }

    @Override
    @Transactional
    public Map<String, Object> reanalyzeAllSubmissions() {
        List<Submission> all = submissionRepository.findAll();
        int processed = 0, errors = 0;
        for (Submission s : all) {
            try {
                runAiAnalysis(s, false);
                processed++;
            } catch (Exception e) {
                log.warn("Re-analysis failed for submission {}: {}", s.getId(), e.getMessage());
                errors++;
            }
        }
        Map<String, Object> result = new HashMap<>();
        result.put("total", all.size());
        result.put("processed", processed);
        result.put("errors", errors);
        result.put("message", "Re-analysis completed for " + processed + " of " + all.size() + " submissions (errors: " + errors + ")");
        return result;
    }

    private SubmissionResponse mapToResponse(Submission s) {
        String reqTitle = null, orgName = null;
        if (s.getComplianceRecord() != null) {
            var rec = s.getComplianceRecord();
            if (rec.getRequirement() != null) reqTitle = rec.getRequirement().getTitle();
            if (rec.getOrganization() != null) orgName = rec.getOrganization().getName();
        }
        return new SubmissionResponse(
                s.getId(),
                s.getComplianceRecord() != null ? s.getComplianceRecord().getId() : null,
                reqTitle,
                s.getComplianceRecord() != null && s.getComplianceRecord().getOrganization() != null
                        ? s.getComplianceRecord().getOrganization().getId() : null,
                orgName,
                s.getSubmittedBy() != null ? s.getSubmittedBy().getId() : null,
                s.getSubmittedBy() != null ? s.getSubmittedBy().getFullName() : null,
                s.getStatus() != null ? s.getStatus() : null,
                s.getReviewComment(),
                s.getSubmissionDate() != null ? s.getSubmissionDate().toString() : null,
                s.getEvidenceUrl(),
                s.getFileHash(),
                s.getAiAnalysisStatus(),
                s.getAiAnalysisDetails(),
                s.getAiScore(),
                s.getExtractedText(),
                s.getDocumentSummary(),
                s.getEvidenceUrl());
    }
}
