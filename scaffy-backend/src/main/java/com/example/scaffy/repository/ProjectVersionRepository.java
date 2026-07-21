package com.example.scaffy.repository;

import com.example.scaffy.model.ProjectVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectVersionRepository extends JpaRepository<ProjectVersion, UUID> {
    List<ProjectVersion> findByProjectIdOrderByVersionNumberDesc(UUID projectId);
    Optional<ProjectVersion> findByProjectIdAndVersionNumber(UUID projectId, Integer versionNumber);
    @Query("SELECT MAX(v.versionNumber) FROM ProjectVersion v WHERE v.projectId = :projectId")
    Optional<Integer> findMaxVersionNumberByProjectId(UUID projectId);
    void deleteByProjectIdAndVersionNumberLessThan(UUID projectId, Integer minVersionNumber);
    long countByProjectId(UUID projectId);
}
