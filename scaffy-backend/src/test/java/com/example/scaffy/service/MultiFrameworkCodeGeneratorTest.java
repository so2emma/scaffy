package com.example.scaffy.service;

import com.example.scaffy.model.*;
import com.example.scaffy.service.impl.*;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

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

    @Test
    public void testDockerAndCiGenerationForAllFrameworks() throws Exception {
        DiagramDto diagram = createSampleDiagram();
        diagram.getEnabledFeatures().put("dockerFile", true);

        for (CodeGenerator generator : generators) {
            diagram.setTargetFramework(generator.getFrameworkId());
            System.out.println("Testing Docker & CI generation for: " + generator.getDisplayName());

            // Test preview includes Docker & CI tabs
            Map<String, String> preview = generator.generatePreview(diagram, "User");
            assertTrue(preview.containsKey("Dockerfile"), "Dockerfile missing in preview for " + generator.getFrameworkId());
            assertTrue(preview.containsKey("docker-compose"), "docker-compose missing in preview for " + generator.getFrameworkId());
            assertTrue(preview.containsKey("GitHub CI"), "GitHub CI missing in preview for " + generator.getFrameworkId());
            assertTrue(preview.containsKey(".env.example"), ".env.example missing in preview for " + generator.getFrameworkId());

            // Test ZIP includes Docker & CI files
            byte[] zipBytes = generator.generateZip(diagram);
            assertNotNull(zipBytes);

            Set<String> entryNames = new HashSet<>();
            try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
                ZipEntry entry;
                while ((entry = zis.getNextEntry()) != null) {
                    entryNames.add(entry.getName());
                }
            }

            String projFolder = "test_project/";
            assertTrue(entryNames.contains(projFolder + "Dockerfile"), "Dockerfile missing in zip for " + generator.getFrameworkId());
            assertTrue(entryNames.contains(projFolder + "docker-compose.yml"), "docker-compose.yml missing in zip for " + generator.getFrameworkId());
            assertTrue(entryNames.contains(projFolder + ".github/workflows/ci.yml"), "ci.yml missing in zip for " + generator.getFrameworkId());
            assertTrue(entryNames.contains(projFolder + ".env.example"), ".env.example missing in zip for " + generator.getFrameworkId());
        }
    }

    @Test
    public void testProjectWidePreviewForAllFrameworks() throws Exception {
        DiagramDto diagram = createSampleDiagram();

        for (CodeGenerator generator : generators) {
            diagram.setTargetFramework(generator.getFrameworkId());
            System.out.println("Testing project-level preview for: " + generator.getDisplayName());

            Map<String, String> preview = generator.generatePreview(diagram, "__PROJECT__");
            assertNotNull(preview, "Project preview should not be null for " + generator.getFrameworkId());
            assertFalse(preview.isEmpty(), "Project preview should not be empty for " + generator.getFrameworkId());

            switch (generator.getFrameworkId()) {
                case "SPRING_BOOT":
                    assertTrue(preview.containsKey("application.properties"));
                    assertTrue(preview.containsKey("pom.xml"));
                    break;
                case "EXPRESS":
                    assertTrue(preview.containsKey("App Configuration"));
                    assertTrue(preview.containsKey("package.json"));
                    assertTrue(preview.containsKey("Prisma Schema"));
                    break;
                case "FASTAPI":
                    assertTrue(preview.containsKey("Main App"));
                    assertTrue(preview.containsKey("Database Config"));
                    assertTrue(preview.containsKey("requirements.txt"));
                    break;
                case "NESTJS":
                    assertTrue(preview.containsKey("App Module"));
                    assertTrue(preview.containsKey("main.ts"));
                    assertTrue(preview.containsKey("package.json"));
                    break;
                case "DJANGO_REST":
                    assertTrue(preview.containsKey("Settings"));
                    assertTrue(preview.containsKey("urls.py"));
                    assertTrue(preview.containsKey("manage.py"));
                    assertTrue(preview.containsKey("requirements.txt"));
                    break;
                case "LARAVEL":
                    assertTrue(preview.containsKey("composer.json"));
                    assertTrue(preview.containsKey("routes/api.php"));
                    assertTrue(preview.containsKey(".env.example"));
                    break;
                case "GIN":
                    assertTrue(preview.containsKey("go.mod"));
                    assertTrue(preview.containsKey("cmd/server/main.go"));
                    assertTrue(preview.containsKey("internal/database/database.go"));
                    break;
                case "RAILS":
                    assertTrue(preview.containsKey("Gemfile"));
                    assertTrue(preview.containsKey("config/routes.rb"));
                    assertTrue(preview.containsKey("config/database.yml"));
                    break;
                default:
                    fail("Unexpected framework: " + generator.getFrameworkId());
            }
        }
    }
}
