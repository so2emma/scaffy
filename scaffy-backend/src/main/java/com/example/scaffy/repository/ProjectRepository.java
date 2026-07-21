package com.example.scaffy.repository;

import com.example.scaffy.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByUserIdOrderByUpdatedAtDesc(UUID userId);
    List<Project> findTop5ByUserIdOrderByLastAccessedAtDesc(UUID userId);
    List<Project> findByUserIdAndIsFavoritedTrueOrderByUpdatedAtDesc(UUID userId);
    Optional<Project> findByIdAndUserId(UUID id, UUID userId);
}
