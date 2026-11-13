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
@Table(name = "penalties")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Penalty {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "violation_id", nullable = false)
    private UUID violationId;

    @Column(nullable = false)
    private double amount;

    @Column(nullable = false)
    private LocalDateTime issuedDate;

    @CreationTimestamp
    private LocalDateTime createdAt;
    @PrePersist
    public void onCreate(){
        this.createdAt = LocalDateTime.now();

    }

}
