package com.rura.regtech.service;

import java.util.UUID;

public interface EvidenceIntegrityService {

    /**
     * Generate SHA-256 hash for file content
     * 
     * @param fileContent the file content as byte array
     * @return SHA-256 hash string
     */
    String generateFileHash(byte[] fileContent);

    /**
     * Store file hash for a submission
     * 
     * @param submissionId the submission id
     * @param fileHash     the generated hash
     */
    void storeFileHash(UUID submissionId, String fileHash);

    /**
     * Verify evidence integrity
     * 
     * @param submissionId       the submission id
     * @param currentFileContent the current file content
     * @return true if integrity verified, false if tampered
     * @throws com.rura.regtech.exception.EvidenceIntegrityException if integrity
     *                                                               check fails
     */
    boolean verifyEvidenceIntegrity(UUID submissionId, byte[] currentFileContent);
}
