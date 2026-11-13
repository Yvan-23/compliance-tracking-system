package com.rura.regtech.service.impl;

import com.rura.regtech.dto.response.ComplianceRecordResponse;
import com.rura.regtech.entity.ComplianceRecord;
import com.rura.regtech.entity.ComplianceRequirement;
import com.rura.regtech.entity.Organization;
import com.rura.regtech.entity.User;
import com.rura.regtech.entity.enums.ComplianceStatus;
import com.rura.regtech.entity.enums.Frequency;
import com.rura.regtech.entity.enums.RoleName;
import com.rura.regtech.exception.ResourceNotFoundException;
import com.rura.regtech.exception.UnauthorizedOperationException;
import com.rura.regtech.repository.ComplianceRecordRepository;
import com.rura.regtech.repository.ComplianceRequirementRepository;
import com.rura.regtech.repository.OrganizationRepository;
import com.rura.regtech.repository.UserRepository;
import com.rura.regtech.service.ComplianceTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplianceTrackingServiceImpl implements ComplianceTrackingService {

    private final OrganizationRepository organizationRepository;
    private final ComplianceRequirementRepository requirementRepository;
    private final ComplianceRecordRepository recordRepository;
    private final UserRepository userRepository;
    private final com.rura.regtech.repository.AuditLogRepository auditLogRepository;
    private final com.rura.regtech.repository.EvidenceRepository evidenceRepository;
    private final com.rura.regtech.service.EvidenceService evidenceService;
    private final com.rura.regtech.service.ComplianceStateMachineService stateMachineService;
    private final com.rura.regtech.service.AiExtractionService aiExtractionService;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private ComplianceTrackingService self;

    @Override
    @Transactional
    public void initializeComplianceCycle(UUID organizationId) {
        log.info("Initializing compliance cycle for organization: {}", organizationId);
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));

        String sector = organization.getSector();
        log.info("Organization sector: {}", sector);

        List<ComplianceRequirement> requirements;
        if (sector != null && !sector.isBlank()) {
            requirements = requirementRepository.findByRegulationSector(sector);
            log.info("Found {} requirements for sector {}", requirements.size(), sector);
        } else {
            requirements = requirementRepository.findAll();
            log.info("No sector set, using all {} requirements", requirements.size());
        }

        if (requirements.isEmpty()) {
            requirements = requirementRepository.findAll();
            log.info("Using all {} requirements as fallback", requirements.size());
        }

        int created = 0;
        for (ComplianceRequirement req : requirements) {
            boolean exists = recordRepository.findByOrganizationIdAndRequirementId(
                    organization.getId(), req.getId()).isPresent();

            if (!exists) {
                createComplianceRecord(organization, req);
                created++;
            }
        }
        log.info("Created {} new compliance records", created);
    }

    private void createComplianceRecord(Organization org, ComplianceRequirement req) {
        ComplianceRecord record = ComplianceRecord.builder()
                .organization(org)
                .requirement(req)
                .status(ComplianceStatus.PENDING)
                .complianceScore(0.0)
                .reportingPeriodStart(LocalDate.now())
                .reportingPeriodEnd(calculateDueDate(req.getFrequency()))
                .build();
        recordRepository.save(record);
    }

    @Override
    @Transactional
    public UUID ensureComplianceRecord(UUID organizationId, UUID requirementId) {
        var existing = recordRepository.findByOrganizationIdAndRequirementId(organizationId, requirementId);
        if (existing.isPresent()) {
            return existing.get().getId();
        }
        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));
        ComplianceRequirement req = requirementRepository.findById(requirementId)
                .orElseThrow(() -> new ResourceNotFoundException("Requirement not found: " + requirementId));
        ComplianceRecord record = ComplianceRecord.builder()
                .organization(org)
                .requirement(req)
                .status(ComplianceStatus.PENDING)
                .complianceScore(0.0)
                .reportingPeriodStart(LocalDate.now())
                .reportingPeriodEnd(calculateDueDate(req.getFrequency()))
                .build();
        recordRepository.save(record);
        log.info("Created compliance record for org {} requirement {}", organizationId, requirementId);
        return record.getId();
    }

    private LocalDate calculateDueDate(Frequency frequency) {
        LocalDate now = LocalDate.now();
        if (frequency == null)
            return now.plusMonths(1);

        switch (frequency) {
            case MONTHLY:
                return now.plusMonths(1);
            case QUARTERLY:
                return now.plusMonths(3);
            case YEARLY:
                return now.plusYears(1);
            case ONE_TIME:
                return now.plusYears(100);
            default:
                return now.plusMonths(1);
        }
    }

    @Override
    @Transactional
    public void calculateComplianceStatus(UUID complianceRecordId) {
        ComplianceRecord record = recordRepository.findById(complianceRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found: " + complianceRecordId));

        if (record.getStatus() == ComplianceStatus.SUBMITTED ||
                record.getStatus() == ComplianceStatus.COMPLIANT ||
                record.getStatus() == ComplianceStatus.WAIVED) {
            return;
        }

        if (LocalDate.now().isAfter(record.getReportingPeriodEnd())) {
            stateMachineService.transitionStatus(complianceRecordId, ComplianceStatus.NON_COMPLIANT);
            record.setStatus(ComplianceStatus.NON_COMPLIANT);
            record.setComplianceScore(0.0);
            log.warn("Compliance record {} marked as NON_COMPLIANT due to overdue", complianceRecordId);
        }

        recordRepository.save(record);
    }

    @Override
    @Transactional(readOnly = true)
    public double computeComplianceScore(UUID organizationId) {
        List<ComplianceRecord> records = recordRepository.findByOrganizationId(organizationId);
        if (records.isEmpty())
            return 100.0;

        double totalPoints = records.stream()
                .mapToDouble(r -> scoreForStatus(r.getStatus()))
                .sum();

        return totalPoints / records.size();
    }

    @Override
    @Transactional
    public void markAsNonCompliant(UUID complianceRecordId, String reason) {
        log.info("Manually marking record {} as non-compliant. Reason: {}", complianceRecordId, reason);
        ComplianceRecord record = recordRepository.findById(complianceRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found: " + complianceRecordId));

        stateMachineService.transitionStatus(complianceRecordId, ComplianceStatus.NON_COMPLIANT);
        record.setStatus(ComplianceStatus.NON_COMPLIANT);
        record.setComplianceScore(0.0);

        // Log manual override
        com.rura.regtech.entity.AuditLog logEntry = com.rura.regtech.entity.AuditLog.builder()
                .action("Manual Non-Compliance Override")
                .details(reason)
                .entityType("ComplianceRecord")
                .entityId(complianceRecordId.toString())
                .build();
        auditLogRepository.save(logEntry);

        recordRepository.save(record);
    }

    @Override
    @Transactional
    public void approveCompliance(UUID complianceRecordId, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean isAuthorized = user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.ENTITY || role.getName() == RoleName.ADMIN || role.getName() == RoleName.AUDITOR);

        if (!isAuthorized) {
            throw new UnauthorizedOperationException("User does not have permission to approve compliance.");
        }

        ComplianceRecord record = recordRepository.findById(complianceRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found: " + complianceRecordId));

        stateMachineService.transitionStatus(complianceRecordId, ComplianceStatus.COMPLIANT);
        record.setStatus(ComplianceStatus.COMPLIANT);
        record.setComplianceScore(100.0);
        recordRepository.save(record);
    }

    @Override
    @Transactional
    public void revertCompliance(UUID complianceRecordId, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean isAuthorized = user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.ENTITY || role.getName() == RoleName.ADMIN || role.getName() == RoleName.AUDITOR);

        if (!isAuthorized) {
            throw new UnauthorizedOperationException("User does not have permission to revert compliance.");
        }

        ComplianceRecord record = recordRepository.findById(complianceRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found: " + complianceRecordId));

        stateMachineService.transitionStatus(complianceRecordId, ComplianceStatus.PENDING);
        record.setStatus(ComplianceStatus.PENDING);
        record.setComplianceScore(0.0);
        recordRepository.save(record);
    }

    @Override
    @Transactional
    public void processWaiverRequest(UUID complianceRecordId, UUID userId, boolean approved, String comment) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        boolean isAuthorized = user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.ENTITY || role.getName() == RoleName.ADMIN);

        if (!isAuthorized) {
            throw new UnauthorizedOperationException("User does not have permission to process waivers.");
        }

        ComplianceRecord record = recordRepository.findById(complianceRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found: " + complianceRecordId));

        ComplianceStatus targetStatus;
        if (approved) {
            targetStatus = ComplianceStatus.WAIVED;
        } else {
            if (LocalDate.now().isAfter(record.getReportingPeriodEnd())) {
                targetStatus = ComplianceStatus.NON_COMPLIANT;
            } else {
                targetStatus = ComplianceStatus.PENDING;
            }
        }

        stateMachineService.transitionStatus(complianceRecordId, targetStatus);
        record.setStatus(targetStatus);
        if (targetStatus == ComplianceStatus.WAIVED) {
            record.setComplianceScore(100.0);
        } else {
            record.setComplianceScore(0.0);
        }
        recordRepository.save(record);

        try {
            auditLogRepository.save(com.rura.regtech.entity.AuditLog.builder()
                    .user(user)
                    .action(approved ? "APPROVE_WAIVER" : "REJECT_WAIVER")
                    .details("Waiver " + (approved ? "approved" : "rejected") + " for record " + complianceRecordId
                            + (comment != null ? " | Comment: " + comment : ""))
                    .entityType("ComplianceRecord")
                    .entityId(complianceRecordId.toString())
                    .build());
        } catch (Exception e) {
            log.warn("Failed to write audit log for waiver processing", e);
        }
    }

    private final com.rura.regtech.repository.ComplianceSnapshotRepository snapshotRepository;

    @Override
    @Transactional
    public void generateComplianceSnapshot(UUID organizationId) {
        // Start snapshot generation logic
        double score = computeComplianceScore(organizationId);
        log.info("SNAPSHOT: Organization {} has current score {}", organizationId, score);

        List<ComplianceRecord> records = recordRepository.findByOrganizationId(organizationId);
        int total = records.size();
        int compliant = (int) records.stream().filter(r -> r.getStatus() == ComplianceStatus.COMPLIANT).count();
        int nonCompliant = (int) records.stream().filter(r -> r.getStatus() == ComplianceStatus.NON_COMPLIANT).count();
        int pending = (int) records.stream().filter(r -> r.getStatus() == ComplianceStatus.PENDING).count();

        com.rura.regtech.entity.ComplianceSnapshot snapshot = com.rura.regtech.entity.ComplianceSnapshot.builder()
                .organizationId(organizationId)
                .overallScore(score)
                .totalRequirements(total)
                .compliantCount(compliant)
                .nonCompliantCount(nonCompliant)
                .pendingCount(pending)
                .build();

        snapshotRepository.save(snapshot);
    }

    @Override
    @Transactional(readOnly = true)
    public com.rura.regtech.dto.response.ComplianceRecordResponse getComplianceRecordById(UUID id) {
        ComplianceRecord record = recordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance record not found: " + id));

        return mapToResponse(record);
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<com.rura.regtech.dto.response.ComplianceRecordResponse> getComplianceRecordsByOrganization(
            UUID organizationId, org.springframework.data.domain.Pageable pageable) {
        self.reconcilePendingRecordsWithEvidence(organizationId);
        return recordRepository.findByOrganizationId(organizationId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional
    public void reconcilePendingRecordsWithEvidence(UUID organizationId) {
        List<ComplianceRecord> allRecords = recordRepository.findByOrganizationId(organizationId);
        if (allRecords.isEmpty()) return;

        List<com.rura.regtech.entity.Evidence> allLinked = evidenceRepository.findByOrganizationId(organizationId)
                .stream()
                .filter(e -> e.getRequirement() != null)
                .collect(java.util.stream.Collectors.toList());

        for (ComplianceRecord record : allRecords) {
            if (record.getRequirement() != null) {
                List<com.rura.regtech.entity.Evidence> evidenceList = evidenceRepository
                        .findByOrganizationIdAndRequirementId(organizationId, record.getRequirement().getId());
                if (!evidenceList.isEmpty()) {
                    if (record.getStatus() == ComplianceStatus.PENDING) {
                        stateMachineService.transitionStatus(record.getId(), ComplianceStatus.SUBMITTED);
                        record.setStatus(ComplianceStatus.SUBMITTED);
                    }
                    if (record.getComplianceScore() == null || record.getComplianceScore() == 0.0 || record.getComplianceScore() == 75.0) {
                        double maxScore = 0.0;
                        boolean hasScore = false;
                        for (com.rura.regtech.entity.Evidence ev : evidenceList) {
                            double evScore = 0.0;
                            if (ev.getSubmission() != null && ev.getSubmission().getAiScore() != null) {
                                evScore = ev.getSubmission().getAiScore();
                                hasScore = true;
                            } else {
                                String ocr = ev.getExtractedText();
                                if (ocr != null && !ocr.isBlank()) {
                                    evScore = aiExtractionService.evaluateComplianceScore(ocr, record.getRequirement().getTitle(), record.getRequirement().getDescription(), ev.getFileName());
                                    hasScore = true;
                                }
                            }
                            if (evScore > maxScore) {
                                maxScore = evScore;
                            }
                        }
                        if (hasScore) {
                            record.setComplianceScore(maxScore);
                        } else {
                            record.setComplianceScore(scoreForStatus(record.getStatus()));
                        }
                    }
                    recordRepository.save(record);
                    log.info("Reconciled compliance record {} to {} with score {}", record.getId(), record.getStatus(), record.getComplianceScore());
                } else {
                    if (record.getStatus() == ComplianceStatus.SUBMITTED || record.getStatus() == ComplianceStatus.COMPLIANT) {
                        stateMachineService.transitionStatus(record.getId(), ComplianceStatus.PENDING);
                        record.setStatus(ComplianceStatus.PENDING);
                        record.setComplianceScore(0.0);
                        recordRepository.save(record);
                        log.info("Reverted compliance record {} to PENDING (no matching evidence)", record.getId());
                    }
                }
            }
        }
    }

    private double scoreForStatus(ComplianceStatus status) {
        switch (status) {
            case COMPLIANT: return 100.0;
            case WAIVED: return 100.0;
            case SUBMITTED: return 0.0;
            case UNDER_REVIEW: return 0.0;
            case NON_COMPLIANT: return 0.0;
            case PENDING: return 0.0;
            default: return 0.0;
        }
    }

    private ComplianceRecordResponse mapToResponse(ComplianceRecord record) {
        Double score = (record.getStatus() == ComplianceStatus.COMPLIANT || record.getStatus() == ComplianceStatus.WAIVED)
                ? (record.getComplianceScore() != null ? record.getComplianceScore() : 100.0)
                : 0.0;
        return new ComplianceRecordResponse(
                record.getId(),
                record.getOrganization() != null ? record.getOrganization().getId() : null,
                record.getOrganization() != null ? record.getOrganization().getName() : null,
                record.getRequirement() != null ? record.getRequirement().getId() : null,
                record.getRequirement() != null ? record.getRequirement().getTitle() : null,
                record.getStatus() != null ? record.getStatus() : null,
                score,
                record.getReportingPeriodStart(),
                record.getReportingPeriodEnd(),
                record.getEscalated() != null ? record.getEscalated() : false,
                record.getEscalationDate());
    }

    @Scheduled(cron = "0 0 0 * * ?")
    @Override
    @Transactional
    public void recalculateAllStatuses() {
        log.info("Starting scheduled compliance recalculation");
        int pageSize = 100;
        int pageNumber = 0;
        Page<ComplianceRecord> page;

        do {
            page = recordRepository.findAll(PageRequest.of(pageNumber, pageSize));
            for (ComplianceRecord record : page.getContent()) {
                if (record.getOrganization() != null) {
                    UUID orgId = record.getOrganization().getId();
                    evidenceService.reconcileAllEvidence(orgId);
                    self.reconcilePendingRecordsWithEvidence(orgId);
                }
            }
            pageNumber++;
        } while (page.hasNext());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ComplianceRecordResponse> getAllComplianceRecords(Pageable pageable) {
        return recordRepository.findAll(pageable).map(this::mapToResponse);
    }
}
