package com.example.scaffy.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SaveTemplateRequest {
    @NotBlank
    private String name;
    private String description;
    private String category;
    private String icon;
    @NotBlank
    private String diagramJson;
    private Integer entityCount;
    private Boolean isPublic;
}
