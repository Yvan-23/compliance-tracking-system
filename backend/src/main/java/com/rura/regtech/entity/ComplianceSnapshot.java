package com.rura.regtech.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "compliance_snapshots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID organizationId;

    @Column(nullable = false)
    private double overallScore;

    @Column(nullable = false)
    private int totalRequirements;

    @Column(nullable = false)
    private int compliantCount;

    @Column(nullable = false)
    private int nonCompliantCount;

    @Column(nullable = false)
    private int pendingCount;

    @CreationTimestamp
    private LocalDateTime snapshottedAt;
}
