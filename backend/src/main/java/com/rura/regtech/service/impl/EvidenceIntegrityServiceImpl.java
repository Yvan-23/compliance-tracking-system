package com.rura.regtech.service.impl;

import com.rura.regtech.entity.Submission;
import com.rura.regtech.exception.EvidenceIntegrityException;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.repository.AuditLogRepository;
import com.rura.regtech.repository.SubmissionRepository;
import com.rura.regtech.service.EvidenceIntegrityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EvidenceIntegrityServiceImpl implements EvidenceIntegrityService {

    private final SubmissionRepository submissionRepository;
    private final AuditLogRepository auditLogRepository;

    @Override
    public String generateFileHash(byte[] fileContent) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(fileContent);
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 algorithm not available", e);
            throw new RuntimeException("Failed to generate file hash", e);
        }
    }

    @Override
    @Transactional
    public void storeFileHash(UUID submissionId, String fileHash) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        submission.setFileHash(fileHash);
        submissionRepository.save(submission);

        log.info("Stored file hash for submission {}", submissionId);
    }

    @Override
    @Transactional
    public boolean verifyEvidenceIntegrity(UUID submissionId, byte[] currentFileContent) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found: " + submissionId));

        String storedHash = submission.getFileHash();
        if (storedHash == null || storedHash.isEmpty()) {
            log.warn("No file hash stored for submission {}", submissionId);
            return false;
        }

        String currentHash = generateFileHash(currentFileContent);
        boolean isValid = storedHash.equals(currentHash);

        // Log verification attempt
        com.rura.regtech.entity.AuditLog auditLog = com.rura.regtech.entity.AuditLog.builder()
                .action("EVIDENCE_INTEGRITY_CHECK")
                .details(String.format("Integrity check %s for submission %s",
                        isValid ? "PASSED" : "FAILED", submissionId))
                .entityType("Submission")
                .entityId(submissionId.toString())
                .build();
        auditLogRepository.save(auditLog);

        if (!isValid) {
            String message = String.format(
                    "Evidence integrity check failed for submission %s. File has been tampered with!",
                    submissionId);
            log.error(message);
            throw new EvidenceIntegrityException(message);
        }

        log.info("Evidence integrity verified for submission {}", submissionId);
        return true;
    }
}
