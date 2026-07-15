package com.example.scaffy.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    private String targetFramework;
    private Map<String, Boolean> enabledFeatures;

    // Manual constructor for backward compatibility in tests
    public DiagramDto(String projectName, String basePackage, List<EntityDto> entities, List<RelationshipDto> relationships) {
        this.projectName = projectName;
        this.basePackage = basePackage;
        this.entities = entities;
        this.relationships = relationships;
        this.openApiSupport = false;
        this.generateTestStubs = false;
        this.flywayMigration = false;
        this.targetFramework = "SPRING_BOOT";
        this.enabledFeatures = new HashMap<>();
    }

    /**
     * Check if a feature is enabled. Checks enabledFeatures map first, then falls back to
     * legacy boolean fields for backward compatibility.
     */
    public boolean isFeatureEnabled(String featureId) {
        if (enabledFeatures != null && enabledFeatures.containsKey(featureId)) {
            return Boolean.TRUE.equals(enabledFeatures.get(featureId));
        }
        // Fallback to legacy booleans
        switch (featureId) {
            case "openApi": return openApiSupport;
            case "mockitoTests": return generateTestStubs;
            case "flywayMigration": return flywayMigration;
            default: return false;
        }
    }

    /**
     * Backward-compatible getter: checks enabledFeatures first, then falls back to the boolean field.
     */
    public boolean isOpenApiSupport() {
        if (enabledFeatures != null && enabledFeatures.containsKey("openApi")) {
            return Boolean.TRUE.equals(enabledFeatures.get("openApi"));
        }
        return openApiSupport;
    }

    /**
     * Backward-compatible getter: checks enabledFeatures first, then falls back to the boolean field.
     */
    public boolean isGenerateTestStubs() {
        if (enabledFeatures != null && enabledFeatures.containsKey("mockitoTests")) {
            return Boolean.TRUE.equals(enabledFeatures.get("mockitoTests"));
        }
        return generateTestStubs;
    }

    /**
     * Backward-compatible getter: checks enabledFeatures first, then falls back to the boolean field.
     */
    public boolean isFlywayMigration() {
        if (enabledFeatures != null && enabledFeatures.containsKey("flywayMigration")) {
            return Boolean.TRUE.equals(enabledFeatures.get("flywayMigration"));
        }
        return flywayMigration;
    }
}
