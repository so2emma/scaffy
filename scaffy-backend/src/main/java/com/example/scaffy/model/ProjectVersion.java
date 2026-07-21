package com.example.scaffy.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "project_versions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "diagram_json", columnDefinition = "TEXT", nullable = false)
    private String diagramJson;

    private String note;

    @Column(updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;
}
