package com.example.scaffy.service;

import com.example.scaffy.model.DiagramDto;
import com.example.scaffy.model.FeatureDescriptor;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public interface CodeGenerator {
    boolean supports(String framework);
    byte[] generateZip(DiagramDto diagram) throws Exception;
    Map<String, String> generatePreview(DiagramDto diagram, String entityName) throws Exception;

    String getFrameworkId();
    String getDisplayName();
    String getLanguage();
    String getDescription();
    String getColor();

    default List<FeatureDescriptor> getAvailableFeatures() {
        return Collections.emptyList();
    }
}
