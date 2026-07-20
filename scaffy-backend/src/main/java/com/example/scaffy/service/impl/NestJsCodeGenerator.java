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

@Component
public class NestJsCodeGenerator implements CodeGenerator {

    private final Configuration freemarkerConfig;

    public NestJsCodeGenerator() {
        this.freemarkerConfig = new Configuration(Configuration.VERSION_2_3_32);
        this.freemarkerConfig.setClassForTemplateLoading(this.getClass(), "/templates/nestjs");
        this.freemarkerConfig.setDefaultEncoding("UTF-8");
        this.freemarkerConfig.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
        this.freemarkerConfig.setLogTemplateExceptions(false);
        this.freemarkerConfig.setWrapUncheckedExceptions(true);
        this.freemarkerConfig.setFallbackOnNullLoopVariable(false);
    }

    @Override
    public String getFrameworkId() {
        return "NESTJS";
    }

    @Override
    public String getDisplayName() {
        return "NestJS";
    }

    @Override
    public String getLanguage() {
        return "TypeScript";
    }

    @Override
    public String getDescription() {
        return "TypeORM · Node.js · TypeScript";
    }

    @Override
    public String getColor() {
        return "#e0234e";
    }

    @Override
    public List<FeatureDescriptor> getAvailableFeatures() {
        return List.of(
                new FeatureDescriptor("openApi", "Swagger / OpenAPI", "Generates Swagger decorators and /api docs endpoint", true),
                new FeatureDescriptor("jestTests", "Jest Unit Tests", "Generates unit test stubs using Jest with mocked repositories", false),
                new FeatureDescriptor("dockerFile", "Dockerfile", "Generates a production-ready Dockerfile and docker-compose.yml", false)
        );
    }

    @Override
    public boolean supports(String framework) {
        return "NESTJS".equalsIgnoreCase(framework);
    }

    @Override
    public byte[] generateZip(DiagramDto diagram) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            String projectFolder = toSnakeCase(diagram.getProjectName()) + "/";

            // Precompute IDs
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
                preparedEntities.add(prepareEntityModel(entity, diagram, entityIdTypes, entityIdNames));
            }

            boolean openApiSupport = diagram.isOpenApiSupport() || diagram.isFeatureEnabled("openApi");
            boolean generateTestStubs = diagram.isGenerateTestStubs() || diagram.isFeatureEnabled("jestTests");
            boolean dockerFile = diagram.isFeatureEnabled("dockerFile");

            // Root model for shared templates
            Map<String, Object> rootModel = new HashMap<>();
            rootModel.put("projectName", diagram.getProjectName());
            rootModel.put("basePackage", diagram.getBasePackage());
            rootModel.put("preparedEntities", preparedEntities);
            rootModel.put("openApiSupport", openApiSupport);
            rootModel.put("generateTestStubs", generateTestStubs);

            // 1. package.json
            zos.putNextEntry(new ZipEntry(projectFolder + "package.json"));
            renderTemplate("package.json.ftl", rootModel, zos);
            zos.closeEntry();

            // 2. tsconfig.json
            zos.putNextEntry(new ZipEntry(projectFolder + "tsconfig.json"));
            renderTemplate("tsconfig.json.ftl", rootModel, zos);
            zos.closeEntry();

            // 4. README.md
            zos.putNextEntry(new ZipEntry(projectFolder + "README.md"));
            renderTemplate("README.md.ftl", rootModel, zos);
            zos.closeEntry();

            // 5. src/main.ts
            zos.putNextEntry(new ZipEntry(projectFolder + "src/main.ts"));
            renderTemplate("main.ts.ftl", rootModel, zos);
            zos.closeEntry();

            // 6. src/app.module.ts
            zos.putNextEntry(new ZipEntry(projectFolder + "src/app.module.ts"));
            renderTemplate("app.module.ts.ftl", rootModel, zos);
            zos.closeEntry();

            // 7. Per-entity files
            for (Map<String, Object> entityModel : preparedEntities) {
                String entityFolder = (String) entityModel.get("entityFolder");

                // Module
                zos.putNextEntry(new ZipEntry(projectFolder + "src/" + entityFolder + "/" + entityFolder + ".module.ts"));
                renderTemplate("entity.module.ts.ftl", entityModel, zos);
                zos.closeEntry();

                // Controller
                zos.putNextEntry(new ZipEntry(projectFolder + "src/" + entityFolder + "/" + entityFolder + ".controller.ts"));
                renderTemplate("entity.controller.ts.ftl", entityModel, zos);
                zos.closeEntry();

                // Service
                zos.putNextEntry(new ZipEntry(projectFolder + "src/" + entityFolder + "/" + entityFolder + ".service.ts"));
                renderTemplate("entity.service.ts.ftl", entityModel, zos);
                zos.closeEntry();

                // Entity
                zos.putNextEntry(new ZipEntry(projectFolder + "src/" + entityFolder + "/entities/" + entityFolder + ".entity.ts"));
                renderTemplate("entity.entity.ts.ftl", entityModel, zos);
                zos.closeEntry();

                // Create DTO
                zos.putNextEntry(new ZipEntry(projectFolder + "src/" + entityFolder + "/dto/create-" + entityFolder + ".dto.ts"));
                renderTemplate("create-entity.dto.ts.ftl", entityModel, zos);
                zos.closeEntry();

                // Update DTO
                zos.putNextEntry(new ZipEntry(projectFolder + "src/" + entityFolder + "/dto/update-" + entityFolder + ".dto.ts"));
                renderTemplate("update-entity.dto.ts.ftl", entityModel, zos);
                zos.closeEntry();

                // Test stubs
                if (generateTestStubs) {
                    zos.putNextEntry(new ZipEntry(projectFolder + "src/" + entityFolder + "/" + entityFolder + ".service.spec.ts"));
                    renderTemplate("entity.service.spec.ts.ftl", entityModel, zos);
                    zos.closeEntry();
                }
            }

            // 8. Docker files
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
                preparedEntities.add(prepareEntityModel(entity, diagram, entityIdTypes, entityIdNames));
            }

            boolean openApiSupport = diagram.isOpenApiSupport() || diagram.isFeatureEnabled("openApi");
            boolean generateTestStubs = diagram.isGenerateTestStubs() || diagram.isFeatureEnabled("jestTests");

            Map<String, Object> rootModel = new HashMap<>();
            rootModel.put("projectName", diagram.getProjectName());
            rootModel.put("basePackage", diagram.getBasePackage());
            rootModel.put("preparedEntities", preparedEntities);
            rootModel.put("openApiSupport", openApiSupport);
            rootModel.put("generateTestStubs", generateTestStubs);

            preview.put("App Module", renderTemplateToString("app.module.ts.ftl", rootModel));
            preview.put("main.ts", renderTemplateToString("main.ts.ftl", rootModel));
            preview.put("package.json", renderTemplateToString("package.json.ftl", rootModel));

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

        // Precompute IDs
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
            preparedEntities.add(prepareEntityModel(entity, diagram, entityIdTypes, entityIdNames));
        }

        Map<String, Object> targetModel = null;
        for (Map<String, Object> model : preparedEntities) {
            if (((String) model.get("name")).equalsIgnoreCase(entityName)) {
                targetModel = model;
                break;
            }
        }

        boolean openApiSupport = diagram.isOpenApiSupport() || diagram.isFeatureEnabled("openApi");

        // Root model for app module
        Map<String, Object> rootModel = new HashMap<>();
        rootModel.put("projectName", diagram.getProjectName());
        rootModel.put("basePackage", diagram.getBasePackage());
        rootModel.put("preparedEntities", preparedEntities);
        rootModel.put("openApiSupport", openApiSupport);

        preview.put("Entity", renderTemplateToString("entity.entity.ts.ftl", targetModel));
        preview.put("Create DTO", renderTemplateToString("create-entity.dto.ts.ftl", targetModel));
        preview.put("Update DTO", renderTemplateToString("update-entity.dto.ts.ftl", targetModel));
        preview.put("Service", renderTemplateToString("entity.service.ts.ftl", targetModel));
        preview.put("Controller", renderTemplateToString("entity.controller.ts.ftl", targetModel));
        preview.put("Module", renderTemplateToString("entity.module.ts.ftl", targetModel));
        preview.put("App Module", renderTemplateToString("app.module.ts.ftl", rootModel));

        if (diagram.isGenerateTestStubs() || diagram.isFeatureEnabled("jestTests")) {
            preview.put("Unit Test", renderTemplateToString("entity.service.spec.ts.ftl", targetModel));
        }

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

    // ---- Template rendering helpers ----

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

    // ---- Entity model preparation ----

    private Map<String, Object> prepareEntityModel(EntityDto entity, DiagramDto diagram,
                                                    Map<String, String> entityIdTypes, Map<String, String> entityIdNames) {
        Map<String, Object> model = new HashMap<>();
        String entityFolder = toKebabCase(entity.getName());

        boolean openApiSupport = diagram.isOpenApiSupport() || diagram.isFeatureEnabled("openApi");

        model.put("projectName", diagram.getProjectName());
        model.put("name", entity.getName());
        model.put("entityFolder", entityFolder);
        model.put("pluralName", toPlural(entity.getName()));
        model.put("pluralLowerName", toPlural(entity.getName()).toLowerCase());
        model.put("tableName", (entity.getTableName() != null && !entity.getTableName().trim().isEmpty())
                ? entity.getTableName().trim() : toSnakeCase(entity.getName()));
        model.put("softDelete", entity.isSoftDelete());
        model.put("openApiSupport", openApiSupport);
        model.put("generateTestStubs", diagram.isGenerateTestStubs() || diagram.isFeatureEnabled("jestTests"));

        // Primary key info
        String primaryKeyName = "id";
        String primaryKeyType = "Long";
        for (AttributeDto attr : entity.getAttributes()) {
            if (attr.isPrimaryKey()) {
                primaryKeyName = attr.getName();
                primaryKeyType = attr.getType();
                break;
            }
        }
        model.put("primaryKeyName", primaryKeyName);
        model.put("primaryKeyType", primaryKeyType);
        model.put("idTsType", getTsType(primaryKeyType));
        model.put("isNumericId", isNumericType(primaryKeyType));

        // Prepare attributes for entity
        List<Map<String, Object>> attributesList = new ArrayList<>();
        List<Map<String, Object>> dtoAttributes = new ArrayList<>();

        for (AttributeDto attr : entity.getAttributes()) {
            Map<String, Object> attrMap = new HashMap<>();
            attrMap.put("name", attr.getName());
            attrMap.put("type", attr.getType());
            attrMap.put("tsType", getTsType(attr.getType()));
            attrMap.put("primaryKey", attr.isPrimaryKey());
            attrMap.put("nullable", attr.isNullable());
            attrMap.put("unique", attr.isUnique());
            attrMap.put("defaultValue", attr.getDefaultValue());
            attrMap.put("columnName", toSnakeCase(attr.getName()));
            attrMap.put("columnOptions", buildColumnOptions(attr));

            if ("Enum".equalsIgnoreCase(attr.getType())) {
                attrMap.put("enumValues", attr.getEnumValues() != null ? attr.getEnumValues() : List.of());
            }

            attributesList.add(attrMap);

            // DTO attributes (skip primary key with auto-generation)
            if (!attr.isPrimaryKey()) {
                Map<String, Object> dtoAttr = new HashMap<>(attrMap);
                dtoAttr.put("validators", buildValidators(attr));
                dtoAttributes.add(dtoAttr);
            }
        }

        model.put("attributes", attributesList);
        model.put("dtoAttributes", dtoAttributes);

        // Prepare relations
        List<Map<String, Object>> relations = new ArrayList<>();
        Set<String> relationImports = new TreeSet<>();
        boolean hasRelations = false;

        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());
                if (!isFrom && !isTo) continue;

                hasRelations = true;
                Map<String, Object> relMap = new HashMap<>();
                String targetEntity = isFrom ? rel.getTo() : rel.getFrom();

                // Ensure correct casing
                for (EntityDto e : diagram.getEntities()) {
                    if (e.getName().equalsIgnoreCase(targetEntity)) {
                        targetEntity = e.getName();
                        break;
                    }
                }

                relationImports.add(targetEntity);

                String targetPKType = entityIdTypes.getOrDefault(targetEntity, "Long");
                boolean fromNullable = rel.getFromNullable() == null || rel.getFromNullable();
                boolean toNullable = rel.getToNullable() == null || rel.getToNullable();

                if ("MANY_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("relationType", "ManyToOne");
                        relMap.put("targetEntity", targetEntity);
                        relMap.put("fieldName", rel.getFromField());
                        relMap.put("joinColumnName", rel.getFromField() + "Id");
                        relMap.put("joinColumnType", getTsType(targetPKType));
                        relMap.put("nullable", fromNullable);
                        relMap.put("isOwner", true);
                        relMap.put("inverseSide", (rel.getToField() != null && !rel.getToField().trim().isEmpty())
                                ? rel.getToField().trim() : toLowerCamelCase(toPlural(entity.getName())));
                    } else {
                        relMap.put("relationType", "OneToMany");
                        relMap.put("targetEntity", targetEntity);
                        relMap.put("fieldName", (rel.getToField() != null && !rel.getToField().trim().isEmpty())
                                ? rel.getToField().trim() : toLowerCamelCase(toPlural(targetEntity)));
                        relMap.put("inverseSide", rel.getFromField());
                        relMap.put("nullable", true);
                        relMap.put("isOwner", false);
                    }
                } else if ("ONE_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("relationType", "OneToMany");
                        relMap.put("targetEntity", targetEntity);
                        relMap.put("fieldName", rel.getFromField());
                        relMap.put("inverseSide", (rel.getToField() != null && !rel.getToField().trim().isEmpty())
                                ? rel.getToField().trim() : toLowerCamelCase(entity.getName()));
                        relMap.put("nullable", true);
                        relMap.put("isOwner", false);
                    } else {
                        String toField = (rel.getToField() != null && !rel.getToField().trim().isEmpty())
                                ? rel.getToField().trim() : toLowerCamelCase(targetEntity);
                        relMap.put("relationType", "ManyToOne");
                        relMap.put("targetEntity", targetEntity);
                        relMap.put("fieldName", toField);
                        relMap.put("joinColumnName", toField + "Id");
                        relMap.put("joinColumnType", getTsType(targetPKType));
                        relMap.put("nullable", toNullable);
                        relMap.put("isOwner", true);
                        relMap.put("inverseSide", rel.getFromField());
                    }
                } else if ("ONE_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("relationType", "OneToOne");
                        relMap.put("targetEntity", targetEntity);
                        relMap.put("fieldName", rel.getFromField());
                        relMap.put("joinColumnName", rel.getFromField() + "Id");
                        relMap.put("joinColumnType", getTsType(targetPKType));
                        relMap.put("nullable", fromNullable);
                        relMap.put("isOwner", true);
                        relMap.put("isUnique", true);
                        relMap.put("inverseSide", (rel.getToField() != null && !rel.getToField().trim().isEmpty())
                                ? rel.getToField().trim() : toLowerCamelCase(entity.getName()));
                    } else {
                        relMap.put("relationType", "OneToOne");
                        relMap.put("targetEntity", targetEntity);
                        relMap.put("fieldName", (rel.getToField() != null && !rel.getToField().trim().isEmpty())
                                ? rel.getToField().trim() : toLowerCamelCase(targetEntity));
                        relMap.put("nullable", true);
                        relMap.put("isOwner", false);
                        relMap.put("isUnique", false);
                        relMap.put("inverseSide", rel.getFromField());
                    }
                } else if ("MANY_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("relationType", "ManyToMany");
                        relMap.put("targetEntity", targetEntity);
                        relMap.put("fieldName", rel.getFromField());
                        relMap.put("isOwner", true);
                        relMap.put("nullable", true);
                        relMap.put("inverseSide", (rel.getToField() != null && !rel.getToField().trim().isEmpty())
                                ? rel.getToField().trim() : toLowerCamelCase(toPlural(entity.getName())));
                    } else {
                        relMap.put("relationType", "ManyToMany");
                        relMap.put("targetEntity", targetEntity);
                        relMap.put("fieldName", (rel.getToField() != null && !rel.getToField().trim().isEmpty())
                                ? rel.getToField().trim() : toLowerCamelCase(toPlural(targetEntity)));
                        relMap.put("isOwner", false);
                        relMap.put("nullable", true);
                        relMap.put("inverseSide", rel.getFromField());
                    }
                }

                relations.add(relMap);
            }
        }

        model.put("relations", relations);
        model.put("relationImports", relationImports);
        model.put("hasRelations", hasRelations);

        return model;
    }

    // ---- Type mapping helpers ----

    private String getTsType(String type) {
        if (type == null) return "string";
        switch (type.toLowerCase()) {
            case "long":
            case "integer":
            case "int":
            case "double":
            case "float":
            case "bigdecimal":
                return "number";
            case "boolean":
                return "boolean";
            case "localdatetime":
            case "localdate":
            case "date":
                return "Date";
            case "uuid":
            case "string":
            case "enum":
            default:
                return "string";
        }
    }

    private boolean isNumericType(String type) {
        if (type == null) return false;
        switch (type.toLowerCase()) {
            case "long":
            case "integer":
            case "int":
            case "double":
            case "float":
            case "bigdecimal":
                return true;
            default:
                return false;
        }
    }

    private String buildColumnOptions(AttributeDto attr) {
        List<String> options = new ArrayList<>();
        if (attr.isNullable()) options.add("nullable: true");
        if (attr.isUnique()) options.add("unique: true");
        if (attr.getDefaultValue() != null && !attr.getDefaultValue().trim().isEmpty()) {
            options.add("default: " + formatDefault(attr));
        }
        String dbType = getDbColumnType(attr.getType());
        if (dbType != null) options.add("type: '" + dbType + "'");
        return String.join(", ", options);
    }

    private String getDbColumnType(String type) {
        if (type == null) return null;
        switch (type.toLowerCase()) {
            case "string":
            case "uuid":
                return "varchar";
            case "integer":
            case "int":
                return "int";
            case "long":
                return "bigint";
            case "double":
            case "float":
                return "float";
            case "bigdecimal":
                return "decimal";
            case "boolean":
                return "boolean";
            case "localdatetime":
                return "timestamp";
            case "localdate":
            case "date":
                return "date";
            default:
                return null;
        }
    }

    private String formatDefault(AttributeDto attr) {
        String val = attr.getDefaultValue();
        String type = attr.getType().toLowerCase();
        if ("boolean".equals(type)) return val.toLowerCase();
        if (isNumericType(attr.getType())) return val;
        return "'" + val + "'";
    }

    private List<String> buildValidators(AttributeDto attr) {
        List<String> validators = new ArrayList<>();
        String type = attr.getType() != null ? attr.getType().toLowerCase() : "string";

        if (!attr.isNullable()) {
            validators.add("@IsNotEmpty()");
        } else {
            validators.add("@IsOptional()");
        }

        switch (type) {
            case "string":
                validators.add("@IsString()");
                break;
            case "uuid":
                validators.add("@IsUUID()");
                break;
            case "integer":
            case "int":
            case "long":
            case "double":
            case "float":
            case "bigdecimal":
                validators.add("@IsNumber()");
                break;
            case "boolean":
                validators.add("@IsBoolean()");
                break;
            case "localdatetime":
            case "localdate":
            case "date":
                validators.add("@IsDate()");
                break;
            case "enum":
                if (attr.getEnumValues() != null && !attr.getEnumValues().isEmpty()) {
                    validators.add("@IsEnum([" + String.join(", ", attr.getEnumValues().stream().map(v -> "'" + v + "'").toList()) + "])");
                }
                break;
            default:
                validators.add("@IsString()");
                break;
        }

        return validators;
    }

    // ---- String utility helpers ----

    private String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
    }

    private String toKebabCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z])([A-Z])", "$1-$2").toLowerCase();
    }

    private String toLowerCamelCase(String str) {
        if (str == null || str.isEmpty()) return "";
        return str.substring(0, 1).toLowerCase() + str.substring(1);
    }

    private String toPlural(String name) {
        if (name == null || name.isEmpty()) return "";
        String lower = name.toLowerCase();
        if (lower.endsWith("y") && !lower.endsWith("ay") && !lower.endsWith("ey") && !lower.endsWith("oy") && !lower.endsWith("uy")) {
            return name.substring(0, name.length() - 1) + "ies";
        } else if (lower.endsWith("s") || lower.endsWith("x") || lower.endsWith("z") || lower.endsWith("ch") || lower.endsWith("sh")) {
            return name + "es";
        } else {
            return name + "s";
        }
    }
}
