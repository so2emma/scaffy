package com.example.scaffy.service;

import com.example.scaffy.model.DiagramDto;
import com.example.scaffy.model.EntityDto;
import com.example.scaffy.model.TemplateDescriptor;
import com.example.scaffy.model.ValidationErrorDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Verifies that every bundled diagram template:
 *  1. Loads and its declared entityCount matches the actual entity count.
 *  2. Passes ValidationService with zero errors (no validation issues).
 *  3. Generates a Spring Boot preview and a full ZIP without throwing.
 */
public class TemplateDiagramsTest {

    private final TemplateService templateService = new TemplateService(new ObjectMapper());
    private final ValidationService validationService = new ValidationService();
    private final CodeGeneratorService codeGeneratorService = new CodeGeneratorService(
            List.of(new com.example.scaffy.service.impl.SpringBootCodeGenerator())
    );

    @Test
    public void templatesAreDiscovered() {
        List<TemplateDescriptor> templates = templateService.getAvailableTemplates();
        assertFalse(templates.isEmpty(), "Expected bundled templates to be discovered");
        // We ship 7 templates
        assertTrue(templates.size() >= 7, "Expected at least 7 templates, found " + templates.size());
    }

    @Test
    public void everyTemplatePassesValidationAndGenerates() {
        List<TemplateDescriptor> templates = templateService.getAvailableTemplates();

        for (TemplateDescriptor meta : templates) {
            DiagramDto diagram = templateService.getTemplateDiagram(meta.getId());
            assertNotNull(diagram, "Diagram missing for template " + meta.getId());

            // 1. entityCount accuracy
            int actual = diagram.getEntities() == null ? 0 : diagram.getEntities().size();
            assertEquals(meta.getEntityCount(), actual,
                    "entityCount mismatch for template '" + meta.getId() + "'");

            // 2. Validation must be clean
            List<ValidationErrorDto> errors = validationService.validate(diagram);
            assertTrue(errors.isEmpty(),
                    "Template '" + meta.getId() + "' has validation issues: " + errors);

            // 3. Preview generation for the first entity + full ZIP generation
            try {
                EntityDto first = diagram.getEntities().get(0);
                var preview = codeGeneratorService.generatePreview(diagram, first.getName());
                assertNotNull(preview);
                assertFalse(preview.isEmpty(),
                        "Empty preview for template '" + meta.getId() + "'");

                byte[] zip = codeGeneratorService.generateZip(diagram);
                assertNotNull(zip);
                assertTrue(zip.length > 0, "Empty ZIP for template '" + meta.getId() + "'");
            } catch (Exception e) {
                fail("Generation failed for template '" + meta.getId() + "': " + e.getMessage(), e);
            }
        }
    }
}
