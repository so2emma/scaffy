package com.example.scaffy.controller;

import com.example.scaffy.model.DiagramDto;
import com.example.scaffy.model.ValidationErrorDto;
import com.example.scaffy.service.CodeGeneratorService;
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
}
