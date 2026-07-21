package com.example.scaffy.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    private String description;
    private String category;

    @Builder.Default
    private String icon = "Package";

    @Column(name = "diagram_json", columnDefinition = "TEXT", nullable = false)
    private String diagramJson;

    @Column(name = "entity_count", nullable = false)
    @Builder.Default
    private Integer entityCount = 0;

    @Column(name = "is_public", nullable = false)
    @Builder.Default
    private Boolean isPublic = false;

    @Column(updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;
}
