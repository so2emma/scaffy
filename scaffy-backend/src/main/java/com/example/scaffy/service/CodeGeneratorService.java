package com.example.scaffy.service;

import com.example.scaffy.model.DiagramDto;
import com.example.scaffy.model.FrameworkDescriptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class CodeGeneratorService {

    private final List<CodeGenerator> generators;

    @Autowired
    public CodeGeneratorService(List<CodeGenerator> generators) {
        this.generators = generators;
    }

    public List<FrameworkDescriptor> getAvailableFrameworks() {
        return generators.stream()
                .map(g -> new FrameworkDescriptor(
                        g.getFrameworkId(),
                        g.getDisplayName(),
                        g.getLanguage(),
                        g.getDescription(),
                        g.getColor(),
                        g.getAvailableFeatures()
                ))
                .toList();
    }

    public byte[] generateZip(DiagramDto diagram) throws Exception {
        CodeGenerator generator = findGenerator(diagram.getTargetFramework());
        return generator.generateZip(diagram);
    }

    public Map<String, String> generatePreview(DiagramDto diagram, String entityName) throws Exception {
        CodeGenerator generator = findGenerator(diagram.getTargetFramework());
        return generator.generatePreview(diagram, entityName);
    }

    private CodeGenerator findGenerator(String framework) {
        return generators.stream()
                .filter(g -> g.supports(framework))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No generator supported for framework: " + framework));
    }
}
