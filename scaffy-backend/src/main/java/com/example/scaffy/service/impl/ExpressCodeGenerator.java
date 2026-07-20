package com.example.scaffy.service.impl;

import com.example.scaffy.model.*;
import com.example.scaffy.service.CodeGenerator;
import com.example.scaffy.service.DockerFileGenerator;
import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateExceptionHandler;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.util.List;

@Component
public class ExpressCodeGenerator implements CodeGenerator {

    private final Configuration freemarkerConfig;

    public ExpressCodeGenerator() {
        this.freemarkerConfig = new Configuration(Configuration.VERSION_2_3_32);
        this.freemarkerConfig.setClassForTemplateLoading(this.getClass(), "/templates/express");
        this.freemarkerConfig.setDefaultEncoding("UTF-8");
        this.freemarkerConfig.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
        this.freemarkerConfig.setLogTemplateExceptions(false);
        this.freemarkerConfig.setWrapUncheckedExceptions(true);
        this.freemarkerConfig.setFallbackOnNullLoopVariable(false);
    }

    @Override
    public String getFrameworkId() {
        return "EXPRESS";
    }

    @Override
    public String getDisplayName() {
        return "Express";
    }

    @Override
    public String getLanguage() {
        return "TypeScript";
    }

    @Override
    public String getDescription() {
        return "Prisma · Node.js · TypeScript";
    }

    @Override
    public String getColor() {
        return "#facc15";
    }

    @Override
    public List<FeatureDescriptor> getAvailableFeatures() {
        return List.of(
                new FeatureDescriptor("jestTests", "Jest Unit Tests", "Generates unit test stubs using Jest", false),
                new FeatureDescriptor("swaggerJSDoc", "Swagger JSDoc", "Generates OpenAPI docs via swagger-jsdoc annotations", true),
                new FeatureDescriptor("dockerFile", "Dockerfile", "Generates a production-ready Dockerfile", false)
        );
    }

    @Override
    public boolean supports(String framework) {
        return "EXPRESS".equalsIgnoreCase(framework);
    }

    @Override
    public byte[] generateZip(DiagramDto diagram) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            String projectFolder = toSnakeCase(diagram.getProjectName()) + "/";

            // Precompute primary keys
            Map<String, String> entityIdTypes = new HashMap<>();
            Map<String, String> entityIdNames = new HashMap<>();
            for (EntityDto entity : diagram.getEntities()) {
                String idType = entity.getAttributes().stream()
                        .filter(AttributeDto::isPrimaryKey)
                        .map(AttributeDto::getType)
                        .findFirst()
                        .orElse("Long");
                entityIdTypes.put(entity.getName(), idType);

                String idName = entity.getAttributes().stream()
                        .filter(AttributeDto::isPrimaryKey)
                        .map(AttributeDto::getName)
                        .findFirst()
                        .orElse("id");
                entityIdNames.put(entity.getName(), idName);
            }

            List<Map<String, Object>> preparedEntities = new ArrayList<>();
            for (EntityDto entity : diagram.getEntities()) {
                preparedEntities.add(prepareExpressEntityModel(entity, diagram, entityIdTypes, entityIdNames));
            }

            List<Map<String, Object>> globalEnums = new ArrayList<>();
            for (Map<String, Object> entityModel : preparedEntities) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> enums = (List<Map<String, Object>>) entityModel.get("enums");
                if (enums != null) {
                    globalEnums.addAll(enums);
                }
            }

            // Shared Model
            Map<String, Object> rootModel = new HashMap<>();
            rootModel.put("projectName", diagram.getProjectName());
            rootModel.put("basePackage", diagram.getBasePackage());
            rootModel.put("entities", diagram.getEntities());
            rootModel.put("relationships", diagram.getRelationships());
            rootModel.put("preparedEntities", preparedEntities);
            rootModel.put("globalEnums", globalEnums);
            rootModel.put("openApiSupport", diagram.isOpenApiSupport());
            rootModel.put("generateTestStubs", diagram.isGenerateTestStubs());
            rootModel.put("flywayMigration", diagram.isFlywayMigration());

            // 1. package.json
            zos.putNextEntry(new ZipEntry(projectFolder + "package.json"));
            renderTemplate("package.json.ftl", rootModel, zos);
            zos.closeEntry();

            // 2. tsconfig.json
            zos.putNextEntry(new ZipEntry(projectFolder + "tsconfig.json"));
            renderTemplate("tsconfig.json.ftl", rootModel, zos);
            zos.closeEntry();

            // 3. prisma/schema.prisma
            zos.putNextEntry(new ZipEntry(projectFolder + "prisma/schema.prisma"));
            renderTemplate("schema.prisma.ftl", rootModel, zos);
            zos.closeEntry();

            // 4. .env
            zos.putNextEntry(new ZipEntry(projectFolder + ".env"));
            renderTemplate(".env.ftl", rootModel, zos);
            zos.closeEntry();

            // 5. README.md
            zos.putNextEntry(new ZipEntry(projectFolder + "README.md"));
            renderTemplate("README.md.ftl", rootModel, zos);
            zos.closeEntry();

            // 6. src/index.ts
            zos.putNextEntry(new ZipEntry(projectFolder + "src/index.ts"));
            renderTemplate("index.ts.ftl", rootModel, zos);
            zos.closeEntry();

            // 7. src/app.ts
            zos.putNextEntry(new ZipEntry(projectFolder + "src/app.ts"));
            renderTemplate("app.ts.ftl", rootModel, zos);
            zos.closeEntry();

            // 8. src/config/database.ts
            zos.putNextEntry(new ZipEntry(projectFolder + "src/config/database.ts"));
            renderTemplate("database.ts.ftl", rootModel, zos);
            zos.closeEntry();

            // 9. src/errors/apiError.ts
            zos.putNextEntry(new ZipEntry(projectFolder + "src/errors/apiError.ts"));
            renderTemplate("apiError.ts.ftl", rootModel, zos);
            zos.closeEntry();

            // 10. src/middleware/errorHandler.ts
            zos.putNextEntry(new ZipEntry(projectFolder + "src/middleware/errorHandler.ts"));
            renderTemplate("errorHandler.ts.ftl", rootModel, zos);
            zos.closeEntry();

            // 11. src/routes/index.ts
            zos.putNextEntry(new ZipEntry(projectFolder + "src/routes/index.ts"));
            renderTemplate("indexRoute.ts.ftl", rootModel, zos);
            zos.closeEntry();

            // 12. Controllers, Services, Routes for Entities
            for (int i = 0; i < diagram.getEntities().size(); i++) {
                EntityDto entity = diagram.getEntities().get(i);
                Map<String, Object> entityModel = preparedEntities.get(i);
                String name = entity.getName();
                String uncapName = toLowerCamelCase(name);

                // Service
                zos.putNextEntry(new ZipEntry(projectFolder + "src/services/" + uncapName + "Service.ts"));
                renderTemplate("service.ts.ftl", entityModel, zos);
                zos.closeEntry();

                // Controller
                zos.putNextEntry(new ZipEntry(projectFolder + "src/controllers/" + uncapName + "Controller.ts"));
                renderTemplate("controller.ts.ftl", entityModel, zos);
                zos.closeEntry();

                // Route
                zos.putNextEntry(new ZipEntry(projectFolder + "src/routes/" + uncapName + "Route.ts"));
                renderTemplate("route.ts.ftl", entityModel, zos);
                zos.closeEntry();
            }
            Boolean dockerEnabled = diagram.getEnabledFeatures() != null
                    && Boolean.TRUE.equals(diagram.getEnabledFeatures().get("dockerFile"));
            if (dockerEnabled) {
                String framework = getFrameworkId();
                String projName = diagram.getProjectName();
                zos.putNextEntry(new ZipEntry(projectFolder + "Dockerfile"));
                zos.write(DockerFileGenerator.generateDockerfile(framework, projName).getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();

                zos.putNextEntry(new ZipEntry(projectFolder + "docker-compose.yml"));
                zos.write(DockerFileGenerator.generateDockerCompose(framework, projName).getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();

                zos.putNextEntry(new ZipEntry(projectFolder + ".github/workflows/ci.yml"));
                zos.write(DockerFileGenerator.generateGithubActionsWorkflow(framework, projName).getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();

                zos.putNextEntry(new ZipEntry(projectFolder + ".env.example"));
                zos.write(DockerFileGenerator.generateDotEnvExample(framework, projName).getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    @Override
    public Map<String, String> generateFullPreview(DiagramDto diagram) throws Exception {
        Map<String, String> preview = new LinkedHashMap<>();
        String projectFolder = toSnakeCase(diagram.getProjectName()) + "/";

        Map<String, String> entityIdTypes = new HashMap<>();
        Map<String, String> entityIdNames = new HashMap<>();
        for (EntityDto entity : diagram.getEntities()) {
            String idType = entity.getAttributes().stream()
                    .filter(AttributeDto::isPrimaryKey)
                    .map(AttributeDto::getType)
                    .findFirst()
                    .orElse("Long");
            entityIdTypes.put(entity.getName(), idType);

            String idName = entity.getAttributes().stream()
                    .filter(AttributeDto::isPrimaryKey)
                    .map(AttributeDto::getName)
                    .findFirst()
                    .orElse("id");
            entityIdNames.put(entity.getName(), idName);
        }

        List<Map<String, Object>> preparedEntities = new ArrayList<>();
        for (EntityDto entity : diagram.getEntities()) {
            preparedEntities.add(prepareExpressEntityModel(entity, diagram, entityIdTypes, entityIdNames));
        }

        List<Map<String, Object>> globalEnums = new ArrayList<>();
        for (Map<String, Object> entityModel : preparedEntities) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> enums = (List<Map<String, Object>>) entityModel.get("enums");
            if (enums != null) {
                globalEnums.addAll(enums);
            }
        }

        Map<String, Object> rootModel = new HashMap<>();
        rootModel.put("projectName", diagram.getProjectName());
        rootModel.put("basePackage", diagram.getBasePackage());
        rootModel.put("entities", diagram.getEntities());
        rootModel.put("relationships", diagram.getRelationships());
        rootModel.put("preparedEntities", preparedEntities);
        rootModel.put("globalEnums", globalEnums);
        rootModel.put("openApiSupport", diagram.isOpenApiSupport());
        rootModel.put("generateTestStubs", diagram.isGenerateTestStubs());
        rootModel.put("flywayMigration", diagram.isFlywayMigration());

        preview.put(projectFolder + "package.json", renderTemplateToString("package.json.ftl", rootModel));
        preview.put(projectFolder + "tsconfig.json", renderTemplateToString("tsconfig.json.ftl", rootModel));
        preview.put(projectFolder + "prisma/schema.prisma", renderTemplateToString("schema.prisma.ftl", rootModel));
        preview.put(projectFolder + ".env", renderTemplateToString(".env.ftl", rootModel));
        preview.put(projectFolder + "README.md", renderTemplateToString("README.md.ftl", rootModel));
        preview.put(projectFolder + "src/index.ts", renderTemplateToString("index.ts.ftl", rootModel));
        preview.put(projectFolder + "src/app.ts", renderTemplateToString("app.ts.ftl", rootModel));
        preview.put(projectFolder + "src/config/database.ts", renderTemplateToString("database.ts.ftl", rootModel));
        preview.put(projectFolder + "src/errors/apiError.ts", renderTemplateToString("apiError.ts.ftl", rootModel));
        preview.put(projectFolder + "src/middleware/errorHandler.ts", renderTemplateToString("errorHandler.ts.ftl", rootModel));
        preview.put(projectFolder + "src/routes/index.ts", renderTemplateToString("indexRoute.ts.ftl", rootModel));

        for (int i = 0; i < diagram.getEntities().size(); i++) {
            EntityDto entity = diagram.getEntities().get(i);
            Map<String, Object> entityModel = preparedEntities.get(i);
            String name = entity.getName();
            String uncapName = toLowerCamelCase(name);

            preview.put(projectFolder + "src/services/" + uncapName + "Service.ts", renderTemplateToString("service.ts.ftl", entityModel));
            preview.put(projectFolder + "src/controllers/" + uncapName + "Controller.ts", renderTemplateToString("controller.ts.ftl", entityModel));
            preview.put(projectFolder + "src/routes/" + uncapName + "Route.ts", renderTemplateToString("route.ts.ftl", entityModel));
        }

        Boolean dockerEnabled = diagram.getEnabledFeatures() != null
                && Boolean.TRUE.equals(diagram.getEnabledFeatures().get("dockerFile"));
        if (dockerEnabled) {
            String framework = getFrameworkId();
            String projName = diagram.getProjectName();
            preview.put(projectFolder + "Dockerfile", DockerFileGenerator.generateDockerfile(framework, projName));
            preview.put(projectFolder + "docker-compose.yml", DockerFileGenerator.generateDockerCompose(framework, projName));
            preview.put(projectFolder + ".github/workflows/ci.yml", DockerFileGenerator.generateGithubActionsWorkflow(framework, projName));
            preview.put(projectFolder + ".env.example", DockerFileGenerator.generateDotEnvExample(framework, projName));
        }

        return preview;
    }

    @Override
    public Map<String, String> generatePreview(DiagramDto diagram, String entityName) throws Exception {
        if ("__PROJECT__".equalsIgnoreCase(entityName)) {
            Map<String, String> preview = new LinkedHashMap<>();

            Map<String, String> entityIdTypes = new HashMap<>();
            Map<String, String> entityIdNames = new HashMap<>();
            for (EntityDto entity : diagram.getEntities()) {
                String idType = entity.getAttributes().stream()
                        .filter(AttributeDto::isPrimaryKey)
                        .map(AttributeDto::getType)
                        .findFirst()
                        .orElse("Long");
                entityIdTypes.put(entity.getName(), idType);

                String idName = entity.getAttributes().stream()
                        .filter(AttributeDto::isPrimaryKey)
                        .map(AttributeDto::getName)
                        .findFirst()
                        .orElse("id");
                entityIdNames.put(entity.getName(), idName);
            }

            List<Map<String, Object>> preparedEntities = new ArrayList<>();
            for (EntityDto entity : diagram.getEntities()) {
                preparedEntities.add(prepareExpressEntityModel(entity, diagram, entityIdTypes, entityIdNames));
            }

            List<Map<String, Object>> globalEnums = new ArrayList<>();
            for (Map<String, Object> entityModel : preparedEntities) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> enums = (List<Map<String, Object>>) entityModel.get("enums");
                if (enums != null) {
                    globalEnums.addAll(enums);
                }
            }

            Map<String, Object> rootModel = new HashMap<>();
            rootModel.put("projectName", diagram.getProjectName());
            rootModel.put("basePackage", diagram.getBasePackage());
            rootModel.put("entities", diagram.getEntities());
            rootModel.put("relationships", diagram.getRelationships());
            rootModel.put("preparedEntities", preparedEntities);
            rootModel.put("globalEnums", globalEnums);
            rootModel.put("openApiSupport", diagram.isOpenApiSupport());
            rootModel.put("generateTestStubs", diagram.isGenerateTestStubs());
            rootModel.put("flywayMigration", diagram.isFlywayMigration());

            preview.put("App Configuration", renderTemplateToString("app.ts.ftl", rootModel));
            preview.put("package.json", renderTemplateToString("package.json.ftl", rootModel));
            preview.put("Prisma Schema", renderTemplateToString("schema.prisma.ftl", rootModel));

            Boolean dockerEnabled = diagram.getEnabledFeatures() != null
                    && Boolean.TRUE.equals(diagram.getEnabledFeatures().get("dockerFile"));
            if (dockerEnabled) {
                String framework = getFrameworkId();
                String projName = diagram.getProjectName();
                preview.put("Dockerfile", DockerFileGenerator.generateDockerfile(framework, projName));
                preview.put("docker-compose", DockerFileGenerator.generateDockerCompose(framework, projName));
                preview.put("GitHub CI", DockerFileGenerator.generateGithubActionsWorkflow(framework, projName));
                preview.put(".env.example", DockerFileGenerator.generateDotEnvExample(framework, projName));
            }

            return preview;
        }

        Map<String, String> preview = new LinkedHashMap<>();

        EntityDto targetEntity = null;
        for (EntityDto entity : diagram.getEntities()) {
            if (entity.getName().equalsIgnoreCase(entityName)) {
                targetEntity = entity;
                break;
            }
        }

        if (targetEntity == null) {
            throw new IllegalArgumentException("Entity not found in diagram: " + entityName);
        }

        // Precompute primary keys
        Map<String, String> entityIdTypes = new HashMap<>();
        Map<String, String> entityIdNames = new HashMap<>();
        for (EntityDto entity : diagram.getEntities()) {
            String idType = entity.getAttributes().stream()
                    .filter(AttributeDto::isPrimaryKey)
                    .map(AttributeDto::getType)
                    .findFirst()
                    .orElse("Long");
            entityIdTypes.put(entity.getName(), idType);

            String idName = entity.getAttributes().stream()
                    .filter(AttributeDto::isPrimaryKey)
                    .map(AttributeDto::getName)
                    .findFirst()
                    .orElse("id");
            entityIdNames.put(entity.getName(), idName);
        }

        List<Map<String, Object>> preparedEntities = new ArrayList<>();
        for (EntityDto entity : diagram.getEntities()) {
            preparedEntities.add(prepareExpressEntityModel(entity, diagram, entityIdTypes, entityIdNames));
        }

        List<Map<String, Object>> globalEnums = new ArrayList<>();
        for (Map<String, Object> entityModel : preparedEntities) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> enums = (List<Map<String, Object>>) entityModel.get("enums");
            if (enums != null) {
                globalEnums.addAll(enums);
            }
        }

        Map<String, Object> targetModel = null;
        for (Map<String, Object> model : preparedEntities) {
            if (((String) model.get("name")).equalsIgnoreCase(entityName)) {
                targetModel = model;
                break;
            }
        }

        // Shared model for Prisma schema
        Map<String, Object> rootModel = new HashMap<>();
        rootModel.put("projectName", diagram.getProjectName());
        rootModel.put("basePackage", diagram.getBasePackage());
        rootModel.put("preparedEntities", preparedEntities);
        rootModel.put("globalEnums", globalEnums);

        preview.put("Prisma Schema", renderTemplateToString("schema.prisma.ftl", rootModel));
        preview.put("Service", renderTemplateToString("service.ts.ftl", targetModel));
        preview.put("Controller", renderTemplateToString("controller.ts.ftl", targetModel));
        preview.put("Route", renderTemplateToString("route.ts.ftl", targetModel));
        preview.put("App Configuration", renderTemplateToString("app.ts.ftl", rootModel));

        Boolean dockerEnabled = diagram.getEnabledFeatures() != null
                && Boolean.TRUE.equals(diagram.getEnabledFeatures().get("dockerFile"));
        if (dockerEnabled) {
            String framework = getFrameworkId();
            String projName = diagram.getProjectName();
            preview.put("Dockerfile", DockerFileGenerator.generateDockerfile(framework, projName));
            preview.put("docker-compose", DockerFileGenerator.generateDockerCompose(framework, projName));
            preview.put("GitHub CI", DockerFileGenerator.generateGithubActionsWorkflow(framework, projName));
            preview.put(".env.example", DockerFileGenerator.generateDotEnvExample(framework, projName));
        }

        return preview;
    }

    private void renderTemplate(String templateName, Map<String, Object> model, ZipOutputStream zos) throws Exception {
        Template template = freemarkerConfig.getTemplate(templateName);
        Writer writer = new OutputStreamWriter(zos, StandardCharsets.UTF_8);
        template.process(model, writer);
        writer.flush();
    }

    private String renderTemplateToString(String templateName, Map<String, Object> model) throws Exception {
        Template template = freemarkerConfig.getTemplate(templateName);
        java.io.StringWriter writer = new java.io.StringWriter();
        template.process(model, writer);
        return writer.toString();
    }

    private Map<String, Object> prepareExpressEntityModel(EntityDto entity, DiagramDto diagram, Map<String, String> entityIdTypes, Map<String, String> entityIdNames) {
        Map<String, Object> model = new HashMap<>();
        model.put("projectName", diagram.getProjectName());
        model.put("name", entity.getName());
        model.put("pluralName", toPlural(entity.getName()));
        model.put("pluralLowerName", toPlural(entity.getName()).toLowerCase());
        model.put("tableName", (entity.getTableName() != null && !entity.getTableName().trim().isEmpty())
                ? entity.getTableName().trim() : toSnakeCase(entity.getName()));
        model.put("softDelete", entity.isSoftDelete());

        // Prepare Attributes
        List<Map<String, Object>> attributesList = new ArrayList<>();
        String primaryKeyName = "id";
        String primaryKeyType = "Long";

        List<Map<String, Object>> enumsList = new ArrayList<>();

        for (AttributeDto attr : entity.getAttributes()) {
            Map<String, Object> attrMap = new HashMap<>();
            attrMap.put("name", attr.getName());
            attrMap.put("type", attr.getType());
            attrMap.put("primaryKey", attr.isPrimaryKey());
            attrMap.put("nullable", attr.isNullable());
            attrMap.put("unique", attr.isUnique());
            attrMap.put("defaultValue", attr.getDefaultValue());
            attrMap.put("columnName", toSnakeCase(attr.getName()));
            attrMap.put("validation", attr.getValidation());

            // Compute Prisma types
            attrMap.put("prismaType", getPrismaType(attr.getType()));
            attrMap.put("prismaDefaultValue", getPrismaDefaultValue(attr));

            if (attr.isPrimaryKey()) {
                primaryKeyName = attr.getName();
                primaryKeyType = attr.getType();
            }

            if ("Enum".equalsIgnoreCase(attr.getType())) {
                String enumClassName = entity.getName() + attr.getName().substring(0, 1).toUpperCase() + attr.getName().substring(1);
                attrMap.put("enumClassName", enumClassName);

                Map<String, Object> enumModel = new HashMap<>();
                enumModel.put("enumClassName", enumClassName);
                enumModel.put("values", attr.getEnumValues());
                enumsList.add(enumModel);
            }

            attributesList.add(attrMap);
        }

        model.put("attributes", attributesList);
        model.put("primaryKeyName", primaryKeyName);
        model.put("primaryKeyType", primaryKeyType);
        model.put("enums", enumsList);

        // Prepare Prisma Relations
        List<Map<String, Object>> prismaRelations = new ArrayList<>();
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());

                if (!isFrom && !isTo) {
                    continue;
                }

                Map<String, Object> relMap = new HashMap<>();
                String targetType = isFrom ? rel.getTo() : rel.getFrom();
                
                // Capitalize correctly
                for (EntityDto e : diagram.getEntities()) {
                    if (e.getName().equalsIgnoreCase(targetType)) {
                        targetType = e.getName();
                        break;
                    }
                }

                String targetPKName = entityIdNames.getOrDefault(targetType, "id");
                String targetPKType = entityIdTypes.getOrDefault(targetType, "Long");

                String relationName = "Relation_" + rel.getFrom() + "_" + rel.getTo() + "_" 
                        + rel.getFromField() + (rel.getToField() != null && !rel.getToField().trim().isEmpty() ? "_" + rel.getToField().trim() : "");

                boolean fromNullable = rel.getFromNullable() == null || rel.getFromNullable();
                boolean toNullable = rel.getToNullable() == null || rel.getToNullable();

                if ("MANY_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("fieldName", rel.getFromField());
                        relMap.put("fieldModelType", targetType);
                        relMap.put("isArray", false);
                        relMap.put("isOwner", true);
                        relMap.put("joinColumnName", rel.getFromField() + "Id");
                        relMap.put("joinColumnType", getPrismaType(targetPKType));
                        relMap.put("referencedColumnName", targetPKName);
                        relMap.put("nullable", fromNullable);
                        relMap.put("isUnique", false);
                    } else {
                        relMap.put("fieldName", (rel.getToField() != null && !rel.getToField().trim().isEmpty()) 
                                ? rel.getToField().trim() : toLowerCamelCase(toPlural(entity.getName())));
                        relMap.put("fieldModelType", targetType);
                        relMap.put("isArray", true);
                        relMap.put("isOwner", false);
                        relMap.put("nullable", true);
                    }
                } else if ("ONE_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("fieldName", rel.getFromField());
                        relMap.put("fieldModelType", targetType);
                        relMap.put("isArray", true);
                        relMap.put("isOwner", false);
                        relMap.put("nullable", true);
                    } else {
                        String toField = (rel.getToField() != null && !rel.getToField().trim().isEmpty()) 
                                ? rel.getToField().trim() : toLowerCamelCase(targetType);
                        relMap.put("fieldName", toField);
                        relMap.put("fieldModelType", targetType);
                        relMap.put("isArray", false);
                        relMap.put("isOwner", true);
                        relMap.put("joinColumnName", toField + "Id");
                        relMap.put("joinColumnType", getPrismaType(targetPKType));
                        relMap.put("referencedColumnName", targetPKName);
                        relMap.put("nullable", toNullable);
                        relMap.put("isUnique", false);
                    }
                } else if ("ONE_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("fieldName", rel.getFromField());
                        relMap.put("fieldModelType", targetType);
                        relMap.put("isArray", false);
                        relMap.put("isOwner", true);
                        relMap.put("joinColumnName", rel.getFromField() + "Id");
                        relMap.put("joinColumnType", getPrismaType(targetPKType));
                        relMap.put("referencedColumnName", targetPKName);
                        relMap.put("nullable", fromNullable);
                        relMap.put("isUnique", true);
                    } else {
                        relMap.put("fieldName", (rel.getToField() != null && !rel.getToField().trim().isEmpty()) 
                                ? rel.getToField().trim() : toLowerCamelCase(targetType));
                        relMap.put("fieldModelType", targetType);
                        relMap.put("isArray", false);
                        relMap.put("isOwner", false);
                        relMap.put("nullable", true);
                        relMap.put("isUnique", false);
                    }
                } else if ("MANY_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("fieldName", rel.getFromField());
                        relMap.put("fieldModelType", targetType);
                        relMap.put("isArray", true);
                        relMap.put("isOwner", false);
                        relMap.put("nullable", true);
                    } else {
                        relMap.put("fieldName", (rel.getToField() != null && !rel.getToField().trim().isEmpty()) 
                                ? rel.getToField().trim() : toLowerCamelCase(toPlural(targetType)));
                        relMap.put("fieldModelType", targetType);
                        relMap.put("isArray", true);
                        relMap.put("isOwner", false);
                        relMap.put("nullable", true);
                    }
                }

                relMap.put("relationName", relationName);
                prismaRelations.add(relMap);
            }
        }
        model.put("prismaRelations", prismaRelations);

        return model;
    }

    private String getPrismaType(String type) {
        if (type == null) return "String";
        switch (type.toLowerCase()) {
            case "long":
            case "integer":
            case "int":
                return "Int";
            case "double":
            case "float":
                return "Float";
            case "bigdecimal":
                return "Float"; // SQLite compatibility
            case "boolean":
                return "Boolean";
            case "localdatetime":
            case "localdate":
            case "date":
                return "DateTime";
            case "uuid":
            case "string":
                return "String";
            case "enum":
                return "String"; // SQLite compatibility, handled as String in db
            default:
                return "String";
        }
    }

    private String getPrismaDefaultValue(AttributeDto attr) {
        String val = attr.getDefaultValue();
        if (val == null || val.trim().isEmpty()) {
            return null;
        }
        String type = attr.getType().toLowerCase();
        if ("boolean".equals(type)) {
            return val.toLowerCase();
        } else if ("long".equals(type) || "integer".equals(type) || "int".equals(type) || "double".equals(type) || "float".equals(type) || "bigdecimal".equals(type)) {
            return val;
        } else if ("localdatetime".equals(type) || "localdate".equals(type) || "date".equals(type)) {
            if ("now".equalsIgnoreCase(val) || "current_timestamp".equalsIgnoreCase(val)) {
                return "now()";
            }
            return "\"" + val + "\"";
        } else {
            return "\"" + val + "\"";
        }
    }

    private String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
    }

    private String toLowerCamelCase(String str) {
        if (str == null || str.isEmpty()) return "";
        return str.substring(0, 1).toLowerCase() + str.substring(1);
    }

    private String toPlural(String name) {
        if (name == null || name.isEmpty()) return "";
        String lower = name.toLowerCase();
        if (lower.endsWith("y")) {
            return name.substring(0, name.length() - 1) + "ies";
        } else if (lower.endsWith("s") || lower.endsWith("x") || lower.endsWith("z") || lower.endsWith("ch") || lower.endsWith("sh")) {
            return name + "es";
        } else {
            return name + "s";
        }
    }
}
