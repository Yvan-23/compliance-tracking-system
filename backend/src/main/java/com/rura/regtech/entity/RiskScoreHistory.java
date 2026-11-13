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
@Table(name = "risk_score_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskScoreHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID organizationId;

    @Column(nullable = false)
    private double riskScore;

    @Column(nullable = false)
    private String riskLevel;

    @CreationTimestamp
    private LocalDateTime recordedAt;

    @PrePersist
    public void onCreate(){
        this.recordedAt = LocalDateTime.now();
    }

}
