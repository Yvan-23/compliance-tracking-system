package com.rura.regtech.repository;

import com.rura.regtech.entity.Regulation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RegulationRepository extends JpaRepository<Regulation, UUID> {
    boolean existsByTitle(String title);
    boolean existsByTitleAndDeletedFalse(String title);

    Page<Regulation> findAllByDeletedFalse(Pageable pageable);

    Optional<Regulation> findByIdAndDeletedFalse(UUID id);

    Page<Regulation> findByTitleContainingIgnoreCaseAndDeletedFalse(String title, Pageable pageable);

    java.util.List<Regulation> findByTitleContainingIgnoreCaseOrSectorContainingIgnoreCase(String title, String sector);

    java.util.List<Regulation> findByDeletedFalseAndTitleContainingIgnoreCaseOrDeletedFalseAndSectorContainingIgnoreCase(String title, String sector);
}
