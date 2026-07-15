package com.example.scaffy.model;

import java.util.List;

public record FrameworkDescriptor(
        String frameworkId,
        String displayName,
        String language,
        String description,
        String color,
        List<FeatureDescriptor> availableFeatures
) {
}
