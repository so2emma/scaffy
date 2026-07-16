package com.example.scaffy.service.impl;

import com.example.scaffy.model.*;
import com.example.scaffy.service.CodeGenerator;
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
public class DjangoRestCodeGenerator implements CodeGenerator {

    private final Configuration freemarkerConfig;

    public DjangoRestCodeGenerator() {
        this.freemarkerConfig = new Configuration(Configuration.VERSION_2_3_32);
        this.freemarkerConfig.setClassForTemplateLoading(this.getClass(), "/templates/django");
        this.freemarkerConfig.setDefaultEncoding("UTF-8");
        this.freemarkerConfig.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
        this.freemarkerConfig.setLogTemplateExceptions(false);
        this.freemarkerConfig.setWrapUncheckedExceptions(true);
        this.freemarkerConfig.setFallbackOnNullLoopVariable(false);
    }

    @Override
    public String getFrameworkId() {
        return "DJANGO_REST";
    }

    @Override
    public String getDisplayName() {
        return "Django REST";
    }

    @Override
    public String getLanguage() {
        return "Python";
    }

    @Override
    public String getDescription() {
        return "Django ORM · DRF · PostgreSQL";
    }

    @Override
    public String getColor() {
        return "#092e20";
    }

    @Override
    public List<FeatureDescriptor> getAvailableFeatures() {
        return List.of(
                new FeatureDescriptor("openApi", "drf-spectacular", "OpenAPI 3 schema with Swagger UI and ReDoc", true),
                new FeatureDescriptor("djangoTests", "API Test Stubs", "Generates APITestCase stubs for CRUD operations", false),
                new FeatureDescriptor("dockerFile", "Dockerfile", "Generates a production-ready Dockerfile and docker-compose.yml", false)
        );
    }

    @Override
    public boolean supports(String framework) {
        return "DJANGO_REST".equalsIgnoreCase(framework);
    }

    @Override
    public byte[] generateZip(DiagramDto diagram) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            String projectNameSnake = toSnakeCase(diagram.getProjectName());
            String projectFolder = projectNameSnake + "/";
            String appName = "api";

            boolean openApiSupport = diagram.isOpenApiSupport() || diagram.isFeatureEnabled("openApi");
            boolean generateTestStubs = diagram.isGenerateTestStubs() || diagram.isFeatureEnabled("djangoTests");

            List<Map<String, Object>> preparedEntities = new ArrayList<>();
            for (EntityDto entity : diagram.getEntities()) {
                preparedEntities.add(prepareEntityModel(entity, diagram));
            }

            Map<String, Object> rootModel = new HashMap<>();
            rootModel.put("projectName", diagram.getProjectName());
            rootModel.put("projectNameSnake", projectNameSnake);
            rootModel.put("appName", appName);
            rootModel.put("preparedEntities", preparedEntities);
            rootModel.put("openApiSupport", openApiSupport);
            rootModel.put("generateTestStubs", generateTestStubs);

            // Top-level files
            zos.putNextEntry(new ZipEntry(projectFolder + "manage.py"));
            renderTemplate("manage.py.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(projectFolder + "requirements.txt"));
            renderTemplate("requirements.txt.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(projectFolder + ".env.example"));
            renderTemplate("env.example.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(projectFolder + "README.md"));
            renderTemplate("README.md.ftl", rootModel, zos);
            zos.closeEntry();

            // Project package: {project_name}/{project_name}/
            String projPkg = projectFolder + projectNameSnake + "/";

            zos.putNextEntry(new ZipEntry(projPkg + "__init__.py"));
            renderTemplate("project_init.py.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(projPkg + "settings.py"));
            renderTemplate("settings.py.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(projPkg + "urls.py"));
            renderTemplate("urls.py.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(projPkg + "wsgi.py"));
            renderTemplate("wsgi.py.ftl", rootModel, zos);
            zos.closeEntry();

            // App package: {project_name}/{app_name}/
            String appPkg = projectFolder + appName + "/";

            zos.putNextEntry(new ZipEntry(appPkg + "__init__.py"));
            renderTemplate("app_init.py.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(appPkg + "models.py"));
            renderTemplate("models.py.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(appPkg + "serializers.py"));
            renderTemplate("serializers.py.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(appPkg + "views.py"));
            renderTemplate("views.py.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(appPkg + "urls.py"));
            renderTemplate("app_urls.py.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(appPkg + "admin.py"));
            renderTemplate("admin.py.ftl", rootModel, zos);
            zos.closeEntry();

            if (generateTestStubs) {
                zos.putNextEntry(new ZipEntry(appPkg + "tests.py"));
                renderTemplate("tests.py.ftl", rootModel, zos);
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

        String projectNameSnake = toSnakeCase(diagram.getProjectName());
        String appName = "api";
        boolean openApiSupport = diagram.isOpenApiSupport() || diagram.isFeatureEnabled("openApi");
        boolean generateTestStubs = diagram.isGenerateTestStubs() || diagram.isFeatureEnabled("djangoTests");

        List<Map<String, Object>> preparedEntities = new ArrayList<>();
        for (EntityDto entity : diagram.getEntities()) {
            preparedEntities.add(prepareEntityModel(entity, diagram));
        }

        Map<String, Object> rootModel = new HashMap<>();
        rootModel.put("projectName", diagram.getProjectName());
        rootModel.put("projectNameSnake", projectNameSnake);
        rootModel.put("appName", appName);
        rootModel.put("preparedEntities", preparedEntities);
        rootModel.put("openApiSupport", openApiSupport);
        rootModel.put("generateTestStubs", generateTestStubs);

        preview.put("Models", renderTemplateToString("models.py.ftl", rootModel));
        preview.put("Serializers", renderTemplateToString("serializers.py.ftl", rootModel));
        preview.put("Views", renderTemplateToString("views.py.ftl", rootModel));
        preview.put("URLs", renderTemplateToString("app_urls.py.ftl", rootModel));
        preview.put("Admin", renderTemplateToString("admin.py.ftl", rootModel));
        preview.put("Settings", renderTemplateToString("settings.py.ftl", rootModel));

        if (generateTestStubs) {
            preview.put("Tests", renderTemplateToString("tests.py.ftl", rootModel));
        }

        return preview;
    }

    // ---- Template rendering ----

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

    private Map<String, Object> prepareEntityModel(EntityDto entity, DiagramDto diagram) {
        Map<String, Object> model = new HashMap<>();
        model.put("name", entity.getName());
        model.put("nameLower", entity.getName().toLowerCase());
        model.put("tableName", (entity.getTableName() != null && !entity.getTableName().trim().isEmpty())
                ? entity.getTableName().trim() : toSnakeCase(entity.getName()));
        model.put("softDelete", entity.isSoftDelete());
        model.put("pluralName", toPlural(entity.getName()));
        model.put("pluralLowerName", toPlural(entity.getName()).toLowerCase());

        // Primary key
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
        model.put("primaryKeyColumnName", toSnakeCase(primaryKeyName));
        model.put("primaryKeyType", primaryKeyType);

        // Attributes
        List<Map<String, Object>> attributesList = new ArrayList<>();
        List<Map<String, Object>> enumsList = new ArrayList<>();

        for (AttributeDto attr : entity.getAttributes()) {
            Map<String, Object> attrMap = new HashMap<>();
            attrMap.put("name", attr.getName());
            attrMap.put("type", attr.getType());
            attrMap.put("columnName", toSnakeCase(attr.getName()));
            attrMap.put("primaryKey", attr.isPrimaryKey());
            attrMap.put("nullable", attr.isNullable());
            attrMap.put("unique", attr.isUnique());
            attrMap.put("defaultValue", attr.getDefaultValue());
            attrMap.put("djangoFieldType", getDjangoFieldType(attr.getType()));
            attrMap.put("fieldArgs", buildDjangoFieldArgs(attr));
            attrMap.put("testValue", getTestValue(attr));

            if ("Enum".equalsIgnoreCase(attr.getType())) {
                String enumClassName = entity.getName() + capitalize(attr.getName());
                attrMap.put("enumClassName", enumClassName);

                Map<String, Object> enumModel = new HashMap<>();
                enumModel.put("enumClassName", enumClassName);
                enumModel.put("values", attr.getEnumValues() != null ? attr.getEnumValues() : List.of());
                enumsList.add(enumModel);
            }

            attributesList.add(attrMap);
        }

        model.put("attributes", attributesList);
        model.put("enums", enumsList);

        // Relationships
        List<Map<String, Object>> relations = new ArrayList<>();
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());
                if (!isFrom && !isTo) continue;

                Map<String, Object> relMap = new HashMap<>();
                String targetType = isFrom ? rel.getTo() : rel.getFrom();

                // Correct casing
                for (EntityDto e : diagram.getEntities()) {
                    if (e.getName().equalsIgnoreCase(targetType)) {
                        targetType = e.getName();
                        break;
                    }
                }

                boolean fromNullable = rel.getFromNullable() == null || rel.getFromNullable();
                boolean toNullable = rel.getToNullable() == null || rel.getToNullable();

                if ("MANY_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("relationType", "ForeignKey");
                        relMap.put("targetType", targetType);
                        relMap.put("fieldName", toSnakeCase(rel.getFromField()));
                        relMap.put("relatedName", toSnakeCase(toPlural(entity.getName())));
                        relMap.put("nullable", fromNullable);
                    } else {
                        // Reverse side — skip (Django auto-creates the reverse accessor)
                        continue;
                    }
                } else if ("ONE_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        // ONE_TO_MANY from this entity: the "to" side has the FK
                        continue;
                    } else {
                        // We are the "to" side with the FK
                        String toField = (rel.getToField() != null && !rel.getToField().trim().isEmpty())
                                ? rel.getToField().trim() : toLowerSnake(targetType);
                        relMap.put("relationType", "ForeignKey");
                        relMap.put("targetType", targetType);
                        relMap.put("fieldName", toSnakeCase(toField));
                        relMap.put("relatedName", toSnakeCase(toPlural(entity.getName())));
                        relMap.put("nullable", toNullable);
                    }
                } else if ("ONE_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("relationType", "OneToOneField");
                        relMap.put("targetType", targetType);
                        relMap.put("fieldName", toSnakeCase(rel.getFromField()));
                        relMap.put("relatedName", toSnakeCase(entity.getName()));
                        relMap.put("nullable", fromNullable);
                    } else {
                        continue;
                    }
                } else if ("MANY_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relMap.put("relationType", "ManyToManyField");
                        relMap.put("targetType", targetType);
                        relMap.put("fieldName", toSnakeCase(rel.getFromField()));
                        relMap.put("relatedName", toSnakeCase(toPlural(entity.getName())));
                        relMap.put("nullable", false);
                    } else {
                        continue;
                    }
                }

                relations.add(relMap);
            }
        }

        model.put("relations", relations);
        return model;
    }

    // ---- Django field type mapping ----

    private String getDjangoFieldType(String type) {
        if (type == null) return "CharField";
        switch (type.toLowerCase()) {
            case "string":
                return "CharField";
            case "integer":
            case "int":
                return "IntegerField";
            case "long":
                return "BigIntegerField";
            case "boolean":
                return "BooleanField";
            case "float":
            case "double":
                return "FloatField";
            case "bigdecimal":
                return "DecimalField";
            case "localdatetime":
                return "DateTimeField";
            case "localdate":
            case "date":
                return "DateField";
            case "uuid":
                return "UUIDField";
            case "text":
                return "TextField";
            case "enum":
                return "CharField";
            default:
                return "CharField";
        }
    }

    private String buildDjangoFieldArgs(AttributeDto attr) {
        List<String> args = new ArrayList<>();
        String type = attr.getType() != null ? attr.getType().toLowerCase() : "string";

        // max_length for CharFields
        if ("string".equals(type) || "enum".equals(type)) {
            args.add("max_length=255");
        }

        // DecimalField needs max_digits and decimal_places
        if ("bigdecimal".equals(type)) {
            args.add("max_digits=19");
            args.add("decimal_places=4");
        }

        if (attr.isNullable()) {
            args.add("null=True");
            args.add("blank=True");
        }

        if (attr.isUnique()) {
            args.add("unique=True");
        }

        if (attr.getDefaultValue() != null && !attr.getDefaultValue().trim().isEmpty()) {
            args.add("default=" + formatPythonDefault(attr.getType(), attr.getDefaultValue()));
        }

        return String.join(", ", args);
    }

    private String formatPythonDefault(String type, String value) {
        if (value == null || value.trim().isEmpty()) return "None";
        String val = value.trim();
        if (type == null) return "'" + val + "'";
        switch (type.toLowerCase()) {
            case "boolean":
                return "true".equalsIgnoreCase(val) || "1".equals(val) ? "True" : "False";
            case "integer":
            case "int":
            case "long":
            case "float":
            case "double":
            case "bigdecimal":
                return val;
            default:
                return "'" + val.replace("'", "\\'") + "'";
        }
    }

    private String getTestValue(AttributeDto attr) {
        String type = attr.getType() != null ? attr.getType().toLowerCase() : "string";
        switch (type) {
            case "string":
                return "'test_" + toSnakeCase(attr.getName()) + "'";
            case "integer":
            case "int":
            case "long":
                return "1";
            case "boolean":
                return "True";
            case "float":
            case "double":
            case "bigdecimal":
                return "1.0";
            case "localdatetime":
                return "'2024-01-01T00:00:00Z'";
            case "localdate":
            case "date":
                return "'2024-01-01'";
            case "uuid":
                return "'00000000-0000-0000-0000-000000000001'";
            case "enum":
                if (attr.getEnumValues() != null && !attr.getEnumValues().isEmpty()) {
                    return "'" + attr.getEnumValues().get(0) + "'";
                }
                return "'VALUE'";
            default:
                return "'test'";
        }
    }

    // ---- String utilities ----

    private String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
    }

    private String toLowerSnake(String str) {
        return toSnakeCase(str);
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return "";
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }

    private String toPlural(String name) {
        if (name == null || name.isEmpty()) return "";
        String lower = name.toLowerCase();
        if (lower.endsWith("y") && !lower.endsWith("ay") && !lower.endsWith("ey")
                && !lower.endsWith("oy") && !lower.endsWith("uy")) {
            return name.substring(0, name.length() - 1) + "ies";
        } else if (lower.endsWith("s") || lower.endsWith("x") || lower.endsWith("z")
                || lower.endsWith("ch") || lower.endsWith("sh")) {
            return name + "es";
        } else {
            return name + "s";
        }
    }
}
