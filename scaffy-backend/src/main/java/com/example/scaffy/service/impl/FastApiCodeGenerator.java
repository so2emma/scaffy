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
public class FastApiCodeGenerator implements CodeGenerator {

    private final Configuration freemarkerConfig;

    public FastApiCodeGenerator() {
        this.freemarkerConfig = new Configuration(Configuration.VERSION_2_3_32);
        this.freemarkerConfig.setClassForTemplateLoading(this.getClass(), "/templates/fastapi");
        this.freemarkerConfig.setDefaultEncoding("UTF-8");
        this.freemarkerConfig.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
        this.freemarkerConfig.setLogTemplateExceptions(false);
        this.freemarkerConfig.setWrapUncheckedExceptions(true);
        this.freemarkerConfig.setFallbackOnNullLoopVariable(false);
    }

    @Override
    public String getFrameworkId() {
        return "FASTAPI";
    }

    @Override
    public String getDisplayName() {
        return "FastAPI";
    }

    @Override
    public String getLanguage() {
        return "Python";
    }

    @Override
    public String getDescription() {
        return "SQLAlchemy · Pydantic · Uvicorn";
    }

    @Override
    public String getColor() {
        return "#38bdf8";
    }

    @Override
    public List<FeatureDescriptor> getAvailableFeatures() {
        return List.of(
                new FeatureDescriptor("openApi", "OpenAPI / Swagger Docs", "FastAPI built-in OpenAPI documentation", true),
                new FeatureDescriptor("alembicMigrations", "Alembic Migrations", "Generates Alembic database migration scripts", false),
                new FeatureDescriptor("pytestStubs", "Pytest Stubs", "Generates pytest-based test stubs for each router", false),
                new FeatureDescriptor("dockerFile", "Dockerfile + Compose + CI", "Generates Dockerfile, docker-compose.yml, and GitHub Actions CI workflow", false)
        );
    }

    @Override
    public boolean supports(String framework) {
        return "FASTAPI".equalsIgnoreCase(framework);
    }

    @Override
    public byte[] generateZip(DiagramDto diagram) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            String projectFolder = toSnakeCase(diagram.getProjectName()) + "/";

            // Precompute helper maps
            Map<String, String> entityIdTypes = new HashMap<>();
            Map<String, String> tableNames = new HashMap<>();
            Map<String, String> pkColumnNames = new HashMap<>();
            for (EntityDto entity : diagram.getEntities()) {
                String idType = entity.getAttributes().stream()
                        .filter(AttributeDto::isPrimaryKey)
                        .map(AttributeDto::getType)
                        .findFirst()
                        .orElse("Long");
                entityIdTypes.put(entity.getName(), idType);
                tableNames.put(entity.getName(), (entity.getTableName() != null && !entity.getTableName().trim().isEmpty())
                        ? entity.getTableName().trim() : toSnakeCase(entity.getName()));
                
                String pkColumnName = entity.getAttributes().stream()
                        .filter(AttributeDto::isPrimaryKey)
                        .map(attr -> toSnakeCase(attr.getName()))
                        .findFirst()
                        .orElse("id");
                pkColumnNames.put(entity.getName(), pkColumnName);
            }

            List<Map<String, Object>> preparedEntities = new ArrayList<>();
            for (EntityDto entity : diagram.getEntities()) {
                preparedEntities.add(prepareEntityModel(entity, diagram, entityIdTypes, tableNames, pkColumnNames));
            }

            Map<String, Object> rootModel = new HashMap<>();
            rootModel.put("projectName", diagram.getProjectName());
            rootModel.put("entities", diagram.getEntities());
            rootModel.put("relationships", diagram.getRelationships());
            rootModel.put("entityIdTypes", entityIdTypes);
            rootModel.put("tableNames", tableNames);
            rootModel.put("pkColumnNames", pkColumnNames);
            rootModel.put("preparedEntities", preparedEntities);
            rootModel.put("openApiSupport", diagram.isOpenApiSupport());
            rootModel.put("generateTestStubs", diagram.isGenerateTestStubs());
            rootModel.put("toSnakeCase", new freemarker.template.TemplateMethodModelEx() {
                @Override
                public Object exec(List args) {
                    if (args.isEmpty() || args.get(0) == null) return "";
                    return toSnakeCase(args.get(0).toString());
                }
            });

            // requirements.txt
            zos.putNextEntry(new ZipEntry(projectFolder + "requirements.txt"));
            renderTemplate("requirements.txt.ftl", rootModel, zos);
            zos.closeEntry();

            // README.md
            zos.putNextEntry(new ZipEntry(projectFolder + "README.md"));
            renderTemplate("README.md.ftl", rootModel, zos);
            zos.closeEntry();

            // app/__init__.py
            zos.putNextEntry(new ZipEntry(projectFolder + "app/__init__.py"));
            zos.write(new byte[0]);
            zos.closeEntry();

            // app/config.py
            zos.putNextEntry(new ZipEntry(projectFolder + "app/config.py"));
            renderTemplate("config.py.ftl", rootModel, zos);
            zos.closeEntry();

            // app/database.py
            zos.putNextEntry(new ZipEntry(projectFolder + "app/database.py"));
            renderTemplate("database.py.ftl", rootModel, zos);
            zos.closeEntry();

            // app/models/__init__.py
            zos.putNextEntry(new ZipEntry(projectFolder + "app/models/__init__.py"));
            renderTemplate("models_init.py.ftl", rootModel, zos);
            zos.closeEntry();

            // app/models/base.py
            zos.putNextEntry(new ZipEntry(projectFolder + "app/models/base.py"));
            renderTemplate("models_base.py.ftl", rootModel, zos);
            zos.closeEntry();

            // app/schemas/__init__.py
            zos.putNextEntry(new ZipEntry(projectFolder + "app/schemas/__init__.py"));
            renderTemplate("schemas_init.py.ftl", rootModel, zos);
            zos.closeEntry();

            // app/crud/__init__.py
            zos.putNextEntry(new ZipEntry(projectFolder + "app/crud/__init__.py"));
            renderTemplate("crud_init.py.ftl", rootModel, zos);
            zos.closeEntry();

            // app/routers/__init__.py
            zos.putNextEntry(new ZipEntry(projectFolder + "app/routers/__init__.py"));
            renderTemplate("routers_init.py.ftl", rootModel, zos);
            zos.closeEntry();

            // app/main.py
            zos.putNextEntry(new ZipEntry(projectFolder + "app/main.py"));
            renderTemplate("main.py.ftl", rootModel, zos);
            zos.closeEntry();

            // Entity-specific code
            for (int i = 0; i < diagram.getEntities().size(); i++) {
                EntityDto entity = diagram.getEntities().get(i);
                Map<String, Object> entityModel = preparedEntities.get(i);
                String snakeName = toSnakeCase(entity.getName());

                // app/models/{entity}.py
                zos.putNextEntry(new ZipEntry(projectFolder + "app/models/" + snakeName + ".py"));
                renderTemplate("model.py.ftl", entityModel, zos);
                zos.closeEntry();

                // app/schemas/{entity}.py
                zos.putNextEntry(new ZipEntry(projectFolder + "app/schemas/" + snakeName + ".py"));
                renderTemplate("schema.py.ftl", entityModel, zos);
                zos.closeEntry();

                // app/crud/{entity}.py
                zos.putNextEntry(new ZipEntry(projectFolder + "app/crud/" + snakeName + ".py"));
                renderTemplate("crud.py.ftl", entityModel, zos);
                zos.closeEntry();

                // app/routers/{entity}.py
                zos.putNextEntry(new ZipEntry(projectFolder + "app/routers/" + snakeName + ".py"));
                renderTemplate("router.py.ftl", entityModel, zos);
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
    public Map<String, String> generatePreview(DiagramDto diagram, String entityName) throws Exception {
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

        Map<String, String> entityIdTypes = new HashMap<>();
        Map<String, String> tableNames = new HashMap<>();
        for (EntityDto entity : diagram.getEntities()) {
            entityIdTypes.put(entity.getName(), entity.getAttributes().stream()
                    .filter(AttributeDto::isPrimaryKey)
                    .map(AttributeDto::getType)
                    .findFirst()
                    .orElse("Long"));
            tableNames.put(entity.getName(), (entity.getTableName() != null && !entity.getTableName().trim().isEmpty())
                    ? entity.getTableName().trim() : toSnakeCase(entity.getName()));
        }

        Map<String, String> pkColumnNames = new HashMap<>();
        for (EntityDto entity : diagram.getEntities()) {
            String pkColumnName = entity.getAttributes().stream()
                    .filter(AttributeDto::isPrimaryKey)
                    .map(attr -> toSnakeCase(attr.getName()))
                    .findFirst()
                    .orElse("id");
            pkColumnNames.put(entity.getName(), pkColumnName);
        }

        List<Map<String, Object>> preparedEntities = new ArrayList<>();
        for (EntityDto entity : diagram.getEntities()) {
            preparedEntities.add(prepareEntityModel(entity, diagram, entityIdTypes, tableNames, pkColumnNames));
        }

        Map<String, Object> entityModel = null;
        for (Map<String, Object> model : preparedEntities) {
            if (((String) model.get("name")).equalsIgnoreCase(entityName)) {
                entityModel = model;
                break;
            }
        }

        preview.put("Model (SQLAlchemy)", renderTemplateToString("model.py.ftl", entityModel));
        preview.put("Schema (Pydantic)", renderTemplateToString("schema.py.ftl", entityModel));
        preview.put("CRUD Helpers", renderTemplateToString("crud.py.ftl", entityModel));
        preview.put("Router", renderTemplateToString("router.py.ftl", entityModel));

        Map<String, Object> rootModel = new HashMap<>();
        rootModel.put("projectName", diagram.getProjectName());
        rootModel.put("entities", diagram.getEntities());
        rootModel.put("openApiSupport", diagram.isOpenApiSupport());
        rootModel.put("toSnakeCase", new freemarker.template.TemplateMethodModelEx() {
            @Override
            public Object exec(List args) {
                if (args.isEmpty() || args.get(0) == null) return "";
                return toSnakeCase(args.get(0).toString());
            }
        });

        preview.put("Main App", renderTemplateToString("main.py.ftl", rootModel));
        preview.put("Database Config", renderTemplateToString("database.py.ftl", rootModel));

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

    private Map<String, Object> prepareEntityModel(EntityDto entity, DiagramDto diagram, Map<String, String> entityIdTypes, Map<String, String> tableNames, Map<String, String> pkColumnNames) {
        Map<String, Object> model = new HashMap<>();
        model.put("projectName", diagram.getProjectName());
        model.put("name", entity.getName());
        model.put("tableName", tableNames.get(entity.getName()));
        model.put("softDelete", entity.isSoftDelete());
        model.put("openApiSupport", diagram.isOpenApiSupport());
        model.put("toSnakeCase", new freemarker.template.TemplateMethodModelEx() {
            @Override
            public Object exec(List args) {
                if (args.isEmpty() || args.get(0) == null) return "";
                return toSnakeCase(args.get(0).toString());
            }
        });

        // Prepare Attributes
        List<Map<String, Object>> attributesList = new ArrayList<>();
        String primaryKeyName = "id";
        String primaryKeyTypeJava = "Long";

        List<Map<String, Object>> enumsList = new ArrayList<>();

        for (AttributeDto attr : entity.getAttributes()) {
            Map<String, Object> attrMap = new HashMap<>();
            attrMap.put("name", attr.getName());
            attrMap.put("type", attr.getType());
            attrMap.put("primaryKey", attr.isPrimaryKey());
            attrMap.put("nullable", attr.isNullable());
            attrMap.put("unique", attr.isUnique());
            attrMap.put("defaultValue", formatPythonDefaultValue(attr.getType(), attr.getDefaultValue()));
            attrMap.put("columnName", toSnakeCase(attr.getName()));
            attrMap.put("validation", attr.getValidation());
            attrMap.put("pythonType", mapToPythonType(attr.getType()));
            attrMap.put("sqlType", mapToSqlAlchemyType(attr.getType()));

            if (attr.isPrimaryKey()) {
                primaryKeyName = attr.getName();
                primaryKeyTypeJava = attr.getType();
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
        model.put("primaryKeyColumnName", toSnakeCase(primaryKeyName));
        model.put("primaryKeyTypeJava", primaryKeyTypeJava);
        model.put("primaryKeyTypePython", mapToPythonType(primaryKeyTypeJava));
        model.put("primaryKeyTypeSql", mapToSqlAlchemyType(primaryKeyTypeJava));
        model.put("enums", enumsList);

        // Prepare Relationships
        List<Map<String, Object>> relationsList = new ArrayList<>();
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());

                if (!isFrom && !isTo) {
                    continue;
                }

                Map<String, Object> relMap = new HashMap<>();
                String targetType;
                String fieldName;
                String relationType = rel.getType();
                boolean isOwner = false;
                String mappedBy = null;
                String otherFieldName = null;
                boolean isBidirectional = rel.getToField() != null && !rel.getToField().trim().isEmpty();

                boolean fromNullable = rel.getFromNullable() == null || rel.getFromNullable();
                boolean toNullable = rel.getToNullable() == null || rel.getToNullable();
                boolean isNullable = true;

                if (isFrom) {
                    targetType = rel.getTo();
                    fieldName = rel.getFromField();
                    otherFieldName = isBidirectional ? rel.getToField() : null;
                    isNullable = fromNullable;

                    if ("ONE_TO_ONE".equalsIgnoreCase(relationType)) {
                        isOwner = true;
                    } else if ("MANY_TO_ONE".equalsIgnoreCase(relationType)) {
                        isOwner = true;
                    } else if ("ONE_TO_MANY".equalsIgnoreCase(relationType)) {
                        isOwner = false;
                        mappedBy = rel.getToField();
                    } else if ("MANY_TO_MANY".equalsIgnoreCase(relationType)) {
                        isOwner = true;
                    }
                } else {
                    targetType = rel.getFrom();
                    fieldName = rel.getToField();
                    otherFieldName = rel.getFromField();
                    isNullable = toNullable;

                    if ("ONE_TO_ONE".equalsIgnoreCase(relationType)) {
                        isOwner = false;
                        mappedBy = rel.getFromField();
                    } else if ("MANY_TO_ONE".equalsIgnoreCase(relationType)) {
                        relationType = "ONE_TO_MANY";
                        isOwner = false;
                        mappedBy = rel.getFromField();
                    } else if ("ONE_TO_MANY".equalsIgnoreCase(relationType)) {
                        relationType = "MANY_TO_ONE";
                        isOwner = true;
                    } else if ("MANY_TO_MANY".equalsIgnoreCase(relationType)) {
                        isOwner = false;
                        mappedBy = rel.getFromField();
                    }
                }

                if (!isBidirectional && isTo) {
                    continue;
                }

                relMap.put("relationType", relationType);
                relMap.put("targetType", targetType);
                relMap.put("fieldName", fieldName);
                relMap.put("targetIdType", entityIdTypes.getOrDefault(targetType, "Long"));
                relMap.put("targetIdTypeSql", mapToSqlAlchemyType(entityIdTypes.getOrDefault(targetType, "Long")));
                relMap.put("targetPKColumnName", pkColumnNames.getOrDefault(targetType, "id"));
                relMap.put("owner", isOwner);
                relMap.put("mappedBy", mappedBy);
                relMap.put("otherFieldName", otherFieldName);
                relMap.put("nullable", isNullable);
                relMap.put("targetTableName", tableNames.getOrDefault(targetType, toSnakeCase(targetType)));

                // Join names
                relMap.put("joinColumnName", toSnakeCase(fieldName) + "_id");
                relMap.put("inverseJoinColumnName", toSnakeCase(targetType) + "_id");
                String joinTableOverride = rel.getJoinTable();
                relMap.put("joinTableName", (joinTableOverride != null && !joinTableOverride.trim().isEmpty())
                        ? joinTableOverride.trim() : toSnakeCase(rel.getFrom()) + "_" + toSnakeCase(rel.getTo()));

                relationsList.add(relMap);
            }
        }

        model.put("relations", relationsList);
        return model;
    }

    private String mapToPythonType(String javaType) {
        if (javaType == null) return "str";
        switch (javaType.trim().toLowerCase()) {
            case "long":
            case "integer":
            case "int":
                return "int";
            case "boolean":
                return "bool";
            case "float":
            case "double":
                return "float";
            case "bigdecimal":
            case "numeric":
                return "Decimal";
            case "localdatetime":
                return "datetime.datetime";
            case "localdate":
                return "datetime.date";
            case "localtime":
                return "datetime.time";
            case "uuid":
                return "UUID";
            default:
                return "str";
        }
    }

    private String mapToSqlAlchemyType(String javaType) {
        if (javaType == null) return "String";
        switch (javaType.trim().toLowerCase()) {
            case "long":
            case "integer":
            case "int":
                return "Integer";
            case "boolean":
                return "Boolean";
            case "float":
            case "double":
                return "Float";
            case "bigdecimal":
            case "numeric":
                return "Numeric";
            case "localdatetime":
                return "DateTime";
            case "localdate":
                return "Date";
            case "localtime":
                return "Time";
            case "uuid":
                return "String";
            default:
                return "String";
        }
    }

    private String formatPythonDefaultValue(String javaType, String defaultValue) {
        if (defaultValue == null || defaultValue.trim().isEmpty() || "null".equalsIgnoreCase(defaultValue)) {
            return null;
        }
        String val = defaultValue.trim();
        if ("Boolean".equalsIgnoreCase(javaType) || "boolean".equalsIgnoreCase(javaType)) {
            if ("true".equalsIgnoreCase(val) || "1".equals(val)) return "True";
            return "False";
        }
        if ("String".equalsIgnoreCase(javaType)) {
            return (char)34 + val.replace(String.valueOf((char)34), "\\" + (char)34) + (char)34;
        }
        return val;
    }

    private String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
    }
}
