package com.rura.regtech.config;

import com.rura.regtech.entity.*;
import com.rura.regtech.entity.enums.*;
import com.rura.regtech.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    

    private final RoleRepository roleRepository;
    private final RegulationRepository regulationRepository;
    private final ComplianceRequirementRepository requirementRepository;
    private final OrganizationRepository organizationRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public void run(String... args) {
        try {
            fixConstraintsIfNeeded();
            initializeRoles();
            initializeRegulations();
            initializeRequirements();
            initializeTestOrganization();
        } catch (Exception e) {
            log.error("Error during data initialization: {}", e.getMessage());
        }
    }

    private void fixConstraintsIfNeeded() {
        try {
            entityManager.createNativeQuery(
                "ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check"
            ).executeUpdate();

            entityManager.createNativeQuery(
                "ALTER TABLE roles ADD CONSTRAINT roles_name_check " +
                "CHECK (name IN ('ADMIN', 'ENTITY', 'AUDITOR'))"
            ).executeUpdate();

            log.info("Fixed roles constraint");
        } catch (Exception e) {
            log.debug("Constraint may already be fixed or doesn't exist: {}", e.getMessage());
        }
    }

    @Transactional
    private void initializeRoles() {
        for (RoleName roleName : RoleName.values()) {
            if (!roleRepository.existsByName(roleName)) {
                try {
                    Role role = Role.builder()
                            .name(roleName)
                            .build();
                    roleRepository.save(role);
                    log.info("Created role: {}", roleName);
                } catch (Exception e) {
                    log.warn("Role {} may already exist: {}", roleName, e.getMessage());
                }
            }
        }
    }

    @Transactional
    private void initializeRegulations() {
        if (regulationRepository.count() > 0) {
            log.info("Regulations already exist, skipping");
            return;
        }

        try {
            Regulation electricity = Regulation.builder()
                    .title("Electricity Regulatory Framework")
                    .description("Regulations for electricity distribution and utilities")
                    .sector("UTILITY")
                    .effectiveDate(LocalDate.now().minusMonths(6))
                    .status(RegulationStatus.ACTIVE)
                    .build();
            regulationRepository.save(electricity);

            Regulation water = Regulation.builder()
                    .title("Water Services Regulatory Framework")
                    .description("Regulations for water service providers")
                    .sector("WATER")
                    .effectiveDate(LocalDate.now().minusMonths(6))
                    .status(RegulationStatus.ACTIVE)
                    .build();
            regulationRepository.save(water);

            Regulation telecom = Regulation.builder()
                    .title("Telecom Regulatory Framework")
                    .description("Regulations for telecommunications")
                    .sector("TELECOM")
                    .effectiveDate(LocalDate.now().minusMonths(6))
                    .status(RegulationStatus.ACTIVE)
                    .build();
            regulationRepository.save(telecom);

            log.info("Created regulations: electricity, water, telecom");
        } catch (Exception e) {
            log.warn("Could not create regulations: {}", e.getMessage());
        }
    }

    @Transactional
    private void initializeRequirements() {
        if (requirementRepository.count() > 0) {
            log.info("Requirements already exist, skipping");
            return;
        }

        var regulations = regulationRepository.findAll();
        if (regulations.isEmpty()) {
            log.warn("No regulations found, cannot create requirements");
            return;
        }

        try {
            for (var reg : regulations) {
                ComplianceRequirement req1 = ComplianceRequirement.builder()
                        .title("Annual Compliance Report Submission")
                        .description("Submit annual compliance report")
                        .regulation(reg)
                        .frequency(Frequency.YEARLY)
                        .build();
                requirementRepository.save(req1);

                ComplianceRequirement req2 = ComplianceRequirement.builder()
                        .title("Quarterly Performance Report")
                        .description("Submit quarterly performance data")
                        .regulation(reg)
                        .frequency(Frequency.QUARTERLY)
                        .build();
                requirementRepository.save(req2);

                ComplianceRequirement req3 = ComplianceRequirement.builder()
                        .title("Safety Inspection Certificate")
                        .description("Annual safety inspection certification")
                        .regulation(reg)
                        .frequency(Frequency.YEARLY)
                        .build();
                requirementRepository.save(req3);
            }
            log.info("Created compliance requirements");
        } catch (Exception e) {
            log.warn("Could not create requirements: {}", e.getMessage());
        }
    }

    @Transactional
    private void initializeTestOrganization() {
        if (organizationRepository.count() > 0) {
            log.info("Organizations already exist, skipping");
            return;
        }

        try {
            Organization testOrg = Organization.builder()
                    .name("Test Water Utility Ltd")
                    .type(OrganizationType.REGULATED_ENTITY)
                    .sector("WATER")
                    .registrationNumber("RW-2024-0001")
                    .status(OrganizationStatus.APPROVED)
                    .build();
            organizationRepository.save(testOrg);
            log.info("Created test organization");
        } catch (Exception e) {
            log.warn("Could not create organization: {}", e.getMessage());
        }
    }
}
