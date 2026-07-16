package com.example.scaffy.service;

import com.example.scaffy.model.DiagramDto;
import com.example.scaffy.model.TemplateDescriptor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class TemplateService {
    private final ObjectMapper objectMapper;
    private final List<TemplateDescriptor> templates;

    public TemplateService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.templates = new ArrayList<>();
        loadTemplates();
    }

    private void loadTemplates() {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:templates/diagrams/*.json");

            for (Resource resource : resources) {
                try {
                    TemplateDescriptor template = objectMapper.readValue(
                        resource.getInputStream(), 
                        TemplateDescriptor.class
                    );
                    templates.add(template);
                } catch (IOException e) {
                    System.err.println("Failed to load template: " + resource.getFilename());
                    e.printStackTrace();
                }
            }
        } catch (IOException e) {
            System.err.println("Failed to scan templates directory");
            e.printStackTrace();
        }
    }

    public List<TemplateDescriptor> getAvailableTemplates() {
        // Return metadata only (without full diagram)
        return templates.stream()
            .map(t -> {
                TemplateDescriptor metadata = new TemplateDescriptor();
                metadata.setId(t.getId());
                metadata.setName(t.getName());
                metadata.setDescription(t.getDescription());
                metadata.setCategory(t.getCategory());
                metadata.setIcon(t.getIcon());
                metadata.setEntityCount(t.getEntityCount());
                // Don't include the diagram in the list response
                return metadata;
            })
            .toList();
    }

    public DiagramDto getTemplateDiagram(String templateId) {
        return templates.stream()
            .filter(t -> t.getId().equals(templateId))
            .map(TemplateDescriptor::getDiagram)
            .findFirst()
            .orElse(null);
    }
}
