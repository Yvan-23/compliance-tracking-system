package com.rura.regtech.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.rura.regtech.entity.enums.EvidenceDocumentType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "evidence")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Evidence {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requirement_id")
    private ComplianceRequirement requirement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id")
    private Submission submission;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String documentName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EvidenceDocumentType documentType;

    private String documentNumber;

    private String issuer;

    private LocalDate issueDate;

    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ExpiryStatus expiryStatus = ExpiryStatus.VALID;

    private Integer daysUntilExpiry;

    @Column(length = 2083)
    private String fileUrl;

    private String fileHash;

    private String fileName;

    private Long fileSize;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String extractedText;

    private String extractedCompanyName;

    private String extractedComplianceStatus;

    private String extractedDocumentNumber;

    private String extractedIssuingAuthority;

    private String extractedIssueDate;

    private String extractedFullName;

    private String extractedAddress;

    private String extractedDocumentType;

    @Column(columnDefinition = "TEXT")
    private String documentSummary;

    @Builder.Default
    private Boolean aiProcessed = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public enum ExpiryStatus {
        VALID,
        EXPIRING_SOON,
        EXPIRED,
        NO_EXPIRY
    }
}
