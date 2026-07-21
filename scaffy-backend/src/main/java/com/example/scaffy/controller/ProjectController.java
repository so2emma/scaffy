package com.example.scaffy.controller;

import com.example.scaffy.model.Project;
import com.example.scaffy.model.ProjectVersion;
import com.example.scaffy.model.User;
import com.example.scaffy.model.dto.ProjectSummaryDto;
import com.example.scaffy.model.dto.SaveProjectRequest;
import com.example.scaffy.model.dto.VersionSummaryDto;
import com.example.scaffy.repository.ProjectRepository;
import com.example.scaffy.repository.ProjectVersionRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {
    private final ProjectRepository projectRepository;
    private final ProjectVersionRepository versionRepository;

    private static final int MAX_VERSIONS = 50;

    // Helper to get current user
    private User getCurrentUser(Authentication auth) {
        return (User) auth.getPrincipal();
    }

    private ProjectSummaryDto toSummary(Project p) {
        return new ProjectSummaryDto(p.getId(), p.getName(), p.getDescription(),
                p.getTargetFramework(), p.getIsFavorited(), p.getEntityCount(),
                p.getLastAccessedAt(), p.getUpdatedAt(), p.getCreatedAt());
    }

    // GET /api/projects?filter=all|recent|favorites
    @GetMapping
    public ResponseEntity<List<ProjectSummaryDto>> getProjects(
            @RequestParam(defaultValue = "all") String filter,
            Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        List<Project> projects = switch (filter) {
            case "recent"    -> projectRepository.findTop5ByUserIdOrderByLastAccessedAtDesc(userId);
            case "favorites" -> projectRepository.findByUserIdAndIsFavoritedTrueOrderByUpdatedAtDesc(userId);
            default          -> projectRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        };
        return ResponseEntity.ok(projects.stream().map(this::toSummary).toList());
    }

    // POST /api/projects
    @PostMapping
    public ResponseEntity<ProjectSummaryDto> createProject(
            @Valid @RequestBody SaveProjectRequest req, Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        Project project = Project.builder()
                .userId(userId)
                .name(req.getName())
                .description(req.getDescription())
                .diagramJson(req.getDiagramJson())
                .targetFramework(req.getTargetFramework())
                .entityCount(req.getEntityCount() != null ? req.getEntityCount() : 0)
                .lastAccessedAt(OffsetDateTime.now())
                .build();
        project = projectRepository.save(project);

        // Create version 1
        versionRepository.save(ProjectVersion.builder()
                .projectId(project.getId())
                .versionNumber(1)
                .diagramJson(req.getDiagramJson())
                .note(req.getVersionNote() != null ? req.getVersionNote() : "Initial save")
                .build());

        return ResponseEntity.ok(toSummary(project));
    }

    // GET /api/projects/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getProject(@PathVariable UUID id, Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        return projectRepository.findByIdAndUserId(id, userId)
                .map(p -> {
                    p.setLastAccessedAt(OffsetDateTime.now());
                    projectRepository.save(p);
                    return ResponseEntity.ok(p);  // return full project including diagramJson
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // PUT /api/projects/{id}
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateProject(@PathVariable UUID id,
            @Valid @RequestBody SaveProjectRequest req, Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        Optional<Project> optProject = projectRepository.findByIdAndUserId(id, userId);
        if (optProject.isEmpty()) return ResponseEntity.notFound().build();

        Project project = optProject.get();

        if (req.getDiagramJson() != null) {
            // Snapshot current state as new version BEFORE overwriting
            int nextVersion = versionRepository.findMaxVersionNumberByProjectId(id)
                    .orElse(0) + 1;
            versionRepository.save(ProjectVersion.builder()
                    .projectId(id)
                    .versionNumber(nextVersion)
                    .diagramJson(req.getDiagramJson())
                    .note(req.getVersionNote() != null ? req.getVersionNote() : "Auto-save")
                    .build());

            // Prune old versions (keep latest 50)
            if (versionRepository.countByProjectId(id) > MAX_VERSIONS) {
                int minKeep = nextVersion - MAX_VERSIONS + 1;
                versionRepository.deleteByProjectIdAndVersionNumberLessThan(id, minKeep);
            }

            project.setDiagramJson(req.getDiagramJson());
        }

        if (req.getName() != null) project.setName(req.getName());
        if (req.getDescription() != null) project.setDescription(req.getDescription());
        if (req.getTargetFramework() != null) project.setTargetFramework(req.getTargetFramework());
        if (req.getEntityCount() != null) project.setEntityCount(req.getEntityCount());
        project.setLastAccessedAt(OffsetDateTime.now());

        return ResponseEntity.ok(toSummary(projectRepository.save(project)));
    }

    // DELETE /api/projects/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable UUID id, Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        return projectRepository.findByIdAndUserId(id, userId)
                .map(p -> { projectRepository.delete(p); return ResponseEntity.noContent().build(); })
                .orElse(ResponseEntity.notFound().build());
    }

    // PATCH /api/projects/{id}/favorite
    @PatchMapping("/{id}/favorite")
    public ResponseEntity<?> toggleFavorite(@PathVariable UUID id, Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        return projectRepository.findByIdAndUserId(id, userId)
                .map(p -> {
                    p.setIsFavorited(!p.getIsFavorited());
                    projectRepository.save(p);
                    return ResponseEntity.ok(Map.of("isFavorited", p.getIsFavorited()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // GET /api/projects/{id}/versions
    @GetMapping("/{id}/versions")
    public ResponseEntity<?> getVersions(@PathVariable UUID id, Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        if (projectRepository.findByIdAndUserId(id, userId).isEmpty())
            return ResponseEntity.notFound().build();
        List<VersionSummaryDto> versions = versionRepository
                .findByProjectIdOrderByVersionNumberDesc(id)
                .stream()
                .map(v -> new VersionSummaryDto(v.getId(), v.getVersionNumber(), v.getNote(), v.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(versions);
    }

    // GET /api/projects/{id}/versions/{versionNumber}
    @GetMapping("/{id}/versions/{versionNumber}")
    public ResponseEntity<?> getVersion(@PathVariable UUID id, @PathVariable Integer versionNumber,
            Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        if (projectRepository.findByIdAndUserId(id, userId).isEmpty())
            return ResponseEntity.notFound().build();
        return versionRepository.findByProjectIdAndVersionNumber(id, versionNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/projects/{id}/versions/{versionNumber}/restore
    @PostMapping("/{id}/versions/{versionNumber}/restore")
    @Transactional
    public ResponseEntity<?> restoreVersion(@PathVariable UUID id, @PathVariable Integer versionNumber,
            Authentication auth) {
        UUID userId = getCurrentUser(auth).getId();
        Optional<Project> optProject = projectRepository.findByIdAndUserId(id, userId);
        if (optProject.isEmpty()) return ResponseEntity.notFound().build();

        Optional<ProjectVersion> optVersion = versionRepository.findByProjectIdAndVersionNumber(id, versionNumber);
        if (optVersion.isEmpty()) return ResponseEntity.notFound().build();

        Project project = optProject.get();
        ProjectVersion version = optVersion.get();

        // Snapshot current state first
        int nextVersion = versionRepository.findMaxVersionNumberByProjectId(id).orElse(0) + 1;
        versionRepository.save(ProjectVersion.builder()
                .projectId(id).versionNumber(nextVersion)
                .diagramJson(project.getDiagramJson())
                .note("Before restore to v" + versionNumber)
                .build());

        // Apply the restored version
        project.setDiagramJson(version.getDiagramJson());
        project.setLastAccessedAt(OffsetDateTime.now());
        return ResponseEntity.ok(toSummary(projectRepository.save(project)));
    }
}
