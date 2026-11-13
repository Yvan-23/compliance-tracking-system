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
@Table(name = "predictive_risk_assessments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictiveRiskAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID organizationId;

    @Builder.Default
    @Column(nullable = false)
    private boolean likelyToFail = false;

    @Column(columnDefinition = "TEXT")
    private String reasoning;

    @CreationTimestamp
    private LocalDateTime assessedAt;

    @PrePersist
    public void onCreate(){
        this.assessedAt = LocalDateTime.now();
    }

}
