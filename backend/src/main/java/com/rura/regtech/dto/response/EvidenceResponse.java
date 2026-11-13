package com.rura.regtech.dto.response;

import com.rura.regtech.entity.enums.EvidenceDocumentType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class EvidenceResponse {

    private UUID id;
    private UUID organizationId;
    private String organizationName;
    private UUID requirementId;
    private String requirementTitle;
    private UUID submissionId;
    private String documentName;
    private EvidenceDocumentType documentType;
    private String documentNumber;
    private String issuer;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    private String expiryStatus;
    private Integer daysUntilExpiry;
    private String fileUrl;
    private String fileHash;
    private String fileName;
    private Long fileSize;
    private String notes;
    private String extractedCompanyName;
    private String extractedComplianceStatus;
    private String extractedDocumentNumber;
    private String extractedIssuingAuthority;
    private String extractedIssueDate;
    private String extractedFullName;
    private String extractedAddress;
    private String extractedDocumentType;
    private String documentSummary;
    private Boolean aiProcessed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public void setOrganizationId(UUID organizationId) {
        this.organizationId = organizationId;
    }

    public String getOrganizationName() {
        return organizationName;
    }

    public void setOrganizationName(String organizationName) {
        this.organizationName = organizationName;
    }

    public UUID getRequirementId() {
        return requirementId;
    }

    public void setRequirementId(UUID requirementId) {
        this.requirementId = requirementId;
    }

    public String getRequirementTitle() {
        return requirementTitle;
    }

    public void setRequirementTitle(String requirementTitle) {
        this.requirementTitle = requirementTitle;
    }

    public UUID getSubmissionId() {
        return submissionId;
    }

    public void setSubmissionId(UUID submissionId) {
        this.submissionId = submissionId;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public EvidenceDocumentType getDocumentType() {
        return documentType;
    }

    public void setDocumentType(EvidenceDocumentType documentType) {
        this.documentType = documentType;
    }

    public String getDocumentNumber() {
        return documentNumber;
    }

    public void setDocumentNumber(String documentNumber) {
        this.documentNumber = documentNumber;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public LocalDate getIssueDate() {
        return issueDate;
    }

    public void setIssueDate(LocalDate issueDate) {
        this.issueDate = issueDate;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public String getExpiryStatus() {
        return expiryStatus;
    }

    public void setExpiryStatus(String expiryStatus) {
        this.expiryStatus = expiryStatus;
    }

    public Integer getDaysUntilExpiry() {
        return daysUntilExpiry;
    }

    public void setDaysUntilExpiry(Integer daysUntilExpiry) {
        this.daysUntilExpiry = daysUntilExpiry;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getFileHash() {
        return fileHash;
    }

    public void setFileHash(String fileHash) {
        this.fileHash = fileHash;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getExtractedCompanyName() {
        return extractedCompanyName;
    }

    public void setExtractedCompanyName(String extractedCompanyName) {
        this.extractedCompanyName = extractedCompanyName;
    }

    public String getExtractedComplianceStatus() {
        return extractedComplianceStatus;
    }

    public void setExtractedComplianceStatus(String extractedComplianceStatus) {
        this.extractedComplianceStatus = extractedComplianceStatus;
    }

    public String getExtractedDocumentNumber() { return extractedDocumentNumber; }
    public void setExtractedDocumentNumber(String v) { this.extractedDocumentNumber = v; }
    public String getExtractedIssuingAuthority() { return extractedIssuingAuthority; }
    public void setExtractedIssuingAuthority(String v) { this.extractedIssuingAuthority = v; }
    public String getExtractedIssueDate() { return extractedIssueDate; }
    public void setExtractedIssueDate(String v) { this.extractedIssueDate = v; }
    public String getExtractedFullName() { return extractedFullName; }
    public void setExtractedFullName(String v) { this.extractedFullName = v; }
    public String getExtractedAddress() { return extractedAddress; }
    public void setExtractedAddress(String v) { this.extractedAddress = v; }
    public String getExtractedDocumentType() { return extractedDocumentType; }
    public void setExtractedDocumentType(String v) { this.extractedDocumentType = v; }

    public String getDocumentSummary() {
        return documentSummary;
    }

    public void setDocumentSummary(String documentSummary) {
        this.documentSummary = documentSummary;
    }

    public Boolean getAiProcessed() {
        return aiProcessed;
    }

    public void setAiProcessed(Boolean aiProcessed) {
        this.aiProcessed = aiProcessed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
