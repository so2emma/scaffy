package com.example.scaffy.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiagramDto {
    private String projectName;
    private String basePackage;
    private List<EntityDto> entities;
    private List<RelationshipDto> relationships;
    private boolean openApiSupport;
    private boolean generateTestStubs;
    private boolean flywayMigration;

    // Manual constructor for backward compatibility in tests
    public DiagramDto(String projectName, String basePackage, List<EntityDto> entities, List<RelationshipDto> relationships) {
        this.projectName = projectName;
        this.basePackage = basePackage;
        this.entities = entities;
        this.relationships = relationships;
        this.openApiSupport = false;
        this.generateTestStubs = false;
        this.flywayMigration = false;
    }
}
