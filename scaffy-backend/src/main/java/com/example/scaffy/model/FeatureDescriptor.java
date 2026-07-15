package com.example.scaffy.model;

public record FeatureDescriptor(
        String id,
        String label,
        String description,
        boolean enabledByDefault
) {
}
