package com.example.scaffy.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProjectSummaryDto {
    private UUID id;
    private String name;
    private String description;
    private String targetFramework;
    private Boolean isFavorited;
    private Integer entityCount;
    private OffsetDateTime lastAccessedAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime createdAt;
}
