package com.example.scaffy.controller;

import com.example.scaffy.model.DiagramDto;
import com.example.scaffy.model.FrameworkDescriptor;
import com.example.scaffy.model.ProjectPathDto;
import com.example.scaffy.model.TemplateDescriptor;
import com.example.scaffy.model.ValidationErrorDto;
import com.example.scaffy.service.CodeGeneratorService;
import com.example.scaffy.service.ReverseEngineeringService;
import com.example.scaffy.service.TemplateService;
import com.example.scaffy.service.ValidationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scaffold")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ScaffolderController {

    private final ValidationService validationService;
    private final CodeGeneratorService codeGeneratorService;
    private final ReverseEngineeringService reverseEngineeringService;
    private final TemplateService templateService;

    @GetMapping("/frameworks")
    public ResponseEntity<List<FrameworkDescriptor>> getFrameworks() {
        return ResponseEntity.ok(codeGeneratorService.getAvailableFrameworks());
    }

    @PostMapping("/validate")
    public ResponseEntity<List<ValidationErrorDto>> validateDiagram(@RequestBody DiagramDto diagram) {
        List<ValidationErrorDto> errors = validationService.validate(diagram);
        return ResponseEntity.ok(errors);
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateScaffold(@RequestBody DiagramDto diagram) {
        List<ValidationErrorDto> errors = validationService.validate(diagram);
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            byte[] zipContent = codeGeneratorService.generateZip(diagram);
            String filename = (diagram.getProjectName() != null ? diagram.getProjectName() : "scaffold") + "-backend.zip";
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(zipContent);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to generate scaffold: " + e.getMessage());
        }
    }

    @PostMapping("/preview")
    public ResponseEntity<?> previewEntity(@RequestParam String entityName, @RequestBody DiagramDto diagram) {
        try {
            java.util.Map<String, String> preview = codeGeneratorService.generatePreview(diagram, entityName);
            return ResponseEntity.ok(preview);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to render preview: " + e.getMessage());
        }
    }

    @PostMapping("/preview/all")
    public ResponseEntity<?> previewAll(@RequestBody DiagramDto diagram) {
        try {
            java.util.Map<String, String> preview = codeGeneratorService.generateFullPreview(diagram);
            return ResponseEntity.ok(preview);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to render preview: " + e.getMessage());
        }
    }

    @PostMapping("/reverse-engineer/ddl")
    public ResponseEntity<?> reverseEngineerDdl(@RequestBody String ddl) {
        try {
            DiagramDto diagram = reverseEngineeringService.parseDdl(ddl);
            return ResponseEntity.ok(diagram);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to parse DDL: " + e.getMessage());
        }
    }

    @PostMapping("/reverse-engineer/spring-boot")
    public ResponseEntity<?> reverseEngineerSpringBoot(@RequestBody ProjectPathDto dto) {
        try {
            DiagramDto diagram = reverseEngineeringService.scanSpringBootProject(dto.getProjectPath());
            return ResponseEntity.ok(diagram);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to scan project: " + e.getMessage());
        }
    }

    @GetMapping("/templates")
    public ResponseEntity<List<TemplateDescriptor>> getTemplates() {
        return ResponseEntity.ok(templateService.getAvailableTemplates());
    }

    @GetMapping("/templates/{id}")
    public ResponseEntity<?> getTemplateDiagram(@PathVariable String id) {
        DiagramDto diagram = templateService.getTemplateDiagram(id);
        if (diagram == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(diagram);
    }
}
