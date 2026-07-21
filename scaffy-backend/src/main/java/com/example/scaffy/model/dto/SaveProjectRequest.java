package com.example.scaffy.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SaveProjectRequest {
    @NotBlank
    private String name;
    private String description;
    @NotBlank
    private String diagramJson;
    private String targetFramework;
    private Integer entityCount;
    private String versionNote;  // optional note for the version being saved
}
