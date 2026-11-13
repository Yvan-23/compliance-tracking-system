package com.rura.regtech.repository;

import com.rura.regtech.entity.PasswordReset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetRepository extends JpaRepository<PasswordReset, UUID> {
    Optional <PasswordReset> findByEmail(String email);

    Optional<PasswordReset> findByEmailAndUsedFalse(String email);

    Optional<PasswordReset> findByEmailAndOtpAndUsedFalse(String email, String otp);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM PasswordReset p WHERE p.email = :email")
    void deleteByEmail(@org.springframework.data.repository.query.Param("email") String email);
}