package com.example.scaffy.service;

import com.example.scaffy.model.*;
import com.example.scaffy.service.impl.*;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class MultiFrameworkCodeGeneratorTest {

    private final List<CodeGenerator> generators = List.of(
            new SpringBootCodeGenerator(),
            new ExpressCodeGenerator(),
            new NestJsCodeGenerator(),
            new FastApiCodeGenerator(),
            new DjangoRestCodeGenerator(),
            new LaravelCodeGenerator(),
            new GinCodeGenerator(),
            new RubyOnRailsCodeGenerator()
    );

    private DiagramDto createSampleDiagram() {
        DiagramDto diagram = new DiagramDto();
        diagram.setProjectName("TestProject");
        diagram.setBasePackage("com.example.test");
        diagram.setTargetFramework("GIN");
        diagram.setEnabledFeatures(new HashMap<>());

        AttributeDto pk = new AttributeDto("id", "Long", null, true, false, true, null);
        AttributeDto name = new AttributeDto("name", "String", null, false, false, false, null);

        AttributeDto statusAttr = new AttributeDto("status", "Enum", null, false, false, false, null);
        statusAttr.setEnumValues(List.of("ACTIVE", "INACTIVE"));

        AttributeDto emailAttr = new AttributeDto("email", "String", null, false, false, false, null);
        ValidationConfigDto validation = new ValidationConfigDto();
        validation.setEmail(true);
        validation.setMinSize(3);
        validation.setMaxSize(50);
        emailAttr.setValidation(validation);

        EntityDto entity = new EntityDto("User", "users", List.of(pk, name, statusAttr, emailAttr));
        entity.setSoftDelete(true);

        EntityDto postEntity = new EntityDto("Post", "posts", List.of(
                new AttributeDto("id", "Long", null, true, false, true, null),
                new AttributeDto("title", "String", null, false, false, false, null)
        ));

        diagram.setEntities(List.of(entity, postEntity));

        RelationshipDto rel = new RelationshipDto(
                "User", "Post", "ONE_TO_MANY", "posts", "user",
                false, true, List.of("ALL"), null
        );
        diagram.setRelationships(List.of(rel));

        return diagram;
    }

    @Test
    public void testAllGeneratorsPreviewAndZip() throws Exception {
        DiagramDto diagram = createSampleDiagram();

        for (CodeGenerator generator : generators) {
            diagram.setTargetFramework(generator.getFrameworkId());
            System.out.println("Testing generator: " + generator.getDisplayName());

            // Test generatePreview
            Map<String, String> preview = generator.generatePreview(diagram, "User");
            assertNotNull(preview, "Preview should not be null for " + generator.getFrameworkId());
            assertFalse(preview.isEmpty(), "Preview should not be empty for " + generator.getFrameworkId());

            // Test generateZip
            byte[] zipBytes = generator.generateZip(diagram);
            assertNotNull(zipBytes, "Zip bytes should not be null for " + generator.getFrameworkId());
            assertTrue(zipBytes.length > 0, "Zip bytes length should be > 0 for " + generator.getFrameworkId());
        }
    }
}
