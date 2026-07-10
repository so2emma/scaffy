package com.example.scaffy.service;

import com.example.scaffy.model.*;
import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateExceptionHandler;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class CodeGeneratorService {

    private final Configuration freemarkerConfig;

    public CodeGeneratorService() {
        this.freemarkerConfig = new Configuration(Configuration.VERSION_2_3_32);
        this.freemarkerConfig.setClassForTemplateLoading(this.getClass(), "/templates/generator");
        this.freemarkerConfig.setDefaultEncoding("UTF-8");
        this.freemarkerConfig.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
        this.freemarkerConfig.setLogTemplateExceptions(false);
        this.freemarkerConfig.setWrapUncheckedExceptions(true);
        this.freemarkerConfig.setFallbackOnNullLoopVariable(false);
    }

    public byte[] generateZip(DiagramDto diagram) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            String projectFolder = toSnakeCase(diagram.getProjectName()) + "/";

            // 1. pom.xml
            Map<String, Object> rootModel = new HashMap<>();
            rootModel.put("basePackage", diagram.getBasePackage());
            rootModel.put("projectName", diagram.getProjectName());
            zos.putNextEntry(new ZipEntry(projectFolder + "pom.xml"));
            renderTemplate("pom.xml.ftl", rootModel, zos);
            zos.closeEntry();

            // 2. application.properties
            zos.putNextEntry(new ZipEntry(projectFolder + "src/main/resources/application.properties"));
            renderTemplate("application.properties.ftl", rootModel, zos);
            zos.closeEntry();

            // 3. Application.java
            String packagePath = "src/main/java/" + diagram.getBasePackage().replace('.', '/') + "/";
            zos.putNextEntry(new ZipEntry(projectFolder + packagePath + diagram.getProjectName() + "Application.java"));
            renderTemplate("Application.java.ftl", rootModel, zos);
            zos.closeEntry();

            // 4. Exception classes
            zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "exception/ResourceNotFoundException.java"));
            renderTemplate("ResourceNotFoundException.java.ftl", rootModel, zos);
            zos.closeEntry();

            zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "exception/GlobalExceptionHandler.java"));
            renderTemplate("GlobalExceptionHandler.java.ftl", rootModel, zos);
            zos.closeEntry();

            // 5. Generate Entity and related architecture files
            Map<String, String> entityIdTypes = new HashMap<>();
            for (EntityDto entity : diagram.getEntities()) {
                String idType = entity.getAttributes().stream()
                        .filter(AttributeDto::isPrimaryKey)
                        .map(AttributeDto::getType)
                        .findFirst()
                        .orElse("Long");
                entityIdTypes.put(entity.getName(), idType);
            }

            for (EntityDto entity : diagram.getEntities()) {
                Map<String, Object> entityModel = prepareEntityModel(entity, diagram, entityIdTypes);

                // Java files paths
                String name = entity.getName();
                
                // Enums (generate before Entity to ensure import compatibility)
                List<Map<String, Object>> enums = (List<Map<String, Object>>) entityModel.get("enums");
                for (Map<String, Object> enumData : enums) {
                    zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "entity/" + enumData.get("enumClassName") + ".java"));
                    renderTemplate("Enum.java.ftl", enumData, zos);
                    zos.closeEntry();
                }

                // Entity
                zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "entity/" + name + ".java"));
                renderTemplate("Entity.java.ftl", entityModel, zos);
                zos.closeEntry();

                // RequestDto
                zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "dto/" + name + "RequestDto.java"));
                renderTemplate("RequestDto.java.ftl", entityModel, zos);
                zos.closeEntry();

                // ResponseDto
                zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "dto/" + name + "ResponseDto.java"));
                renderTemplate("ResponseDto.java.ftl", entityModel, zos);
                zos.closeEntry();

                // Mapper
                zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "mapper/" + name + "Mapper.java"));
                renderTemplate("Mapper.java.ftl", entityModel, zos);
                zos.closeEntry();

                // Repository
                zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "repository/" + name + "Repository.java"));
                renderTemplate("Repository.java.ftl", entityModel, zos);
                zos.closeEntry();

                // Service
                zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "service/" + name + "Service.java"));
                renderTemplate("Service.java.ftl", entityModel, zos);
                zos.closeEntry();

                // ServiceImpl
                zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "service/impl/" + name + "ServiceImpl.java"));
                renderTemplate("ServiceImpl.java.ftl", entityModel, zos);
                zos.closeEntry();

                // Controller
                zos.putNextEntry(new ZipEntry(projectFolder + packagePath + "controller/" + name + "Controller.java"));
                renderTemplate("Controller.java.ftl", entityModel, zos);
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    private void renderTemplate(String templateName, Map<String, Object> model, ZipOutputStream zos) throws Exception {
        Template template = freemarkerConfig.getTemplate(templateName);
        Writer writer = new OutputStreamWriter(zos, StandardCharsets.UTF_8);
        template.process(model, writer);
        writer.flush();
    }

    private Map<String, Object> prepareEntityModel(EntityDto entity, DiagramDto diagram, Map<String, String> entityIdTypes) {
        Map<String, Object> model = new HashMap<>();
        model.put("basePackage", diagram.getBasePackage());
        model.put("projectName", diagram.getProjectName());
        model.put("name", entity.getName());
        model.put("tableName", (entity.getTableName() != null && !entity.getTableName().trim().isEmpty())
                ? entity.getTableName().trim() : toSnakeCase(entity.getName()));

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

            if (attr.isPrimaryKey()) {
                primaryKeyName = attr.getName();
                primaryKeyType = attr.getType();
            }

            if ("Enum".equalsIgnoreCase(attr.getType())) {
                String enumClassName = entity.getName() + attr.getName().substring(0, 1).toUpperCase() + attr.getName().substring(1);
                attrMap.put("enumClassName", enumClassName);

                Map<String, Object> enumModel = new HashMap<>();
                enumModel.put("basePackage", diagram.getBasePackage());
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

        // Prepare Relationships
        List<Map<String, Object>> relationsList = new ArrayList<>();
        Set<String> relatedReposSet = new HashSet<>();
        List<Map<String, Object>> relationRepositoriesList = new ArrayList<>();
        List<String> relationshipFields = new ArrayList<>();

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

                List<String> cascadeTypes = new ArrayList<>();
                if (rel.getCascade() != null && !rel.getCascade().isEmpty()) {
                    for (String cas : rel.getCascade()) {
                        cascadeTypes.add(cas.toUpperCase());
                    }
                } else {
                    cascadeTypes.add("ALL"); // Default cascade
                }

                if (isFrom) {
                    targetType = rel.getTo();
                    fieldName = rel.getFromField();
                    otherFieldName = isBidirectional ? rel.getToField() : null;
                    isNullable = fromNullable;

                    if ("ONE_TO_ONE".equalsIgnoreCase(relationType)) {
                        isOwner = true;
                        mappedBy = null;
                    } else if ("MANY_TO_ONE".equalsIgnoreCase(relationType)) {
                        isOwner = true;
                        mappedBy = null;
                    } else if ("ONE_TO_MANY".equalsIgnoreCase(relationType)) {
                        isOwner = false;
                        mappedBy = rel.getToField();
                    } else if ("MANY_TO_MANY".equalsIgnoreCase(relationType)) {
                        isOwner = true; // 'from' owns the MANY_TO_MANY by default
                        mappedBy = null;
                    }
                } else {
                    // isTo is true
                    targetType = rel.getFrom();
                    fieldName = rel.getToField();
                    otherFieldName = rel.getFromField();
                    isNullable = toNullable;

                    // Swap relation types for target perspective
                    if ("ONE_TO_ONE".equalsIgnoreCase(relationType)) {
                        isOwner = false;
                        mappedBy = rel.getFromField();
                    } else if ("MANY_TO_ONE".equalsIgnoreCase(relationType)) {
                        // MANY_TO_ONE from U to V means V is ONE_TO_MANY to U
                        relationType = "ONE_TO_MANY";
                        isOwner = false;
                        mappedBy = rel.getFromField();
                    } else if ("ONE_TO_MANY".equalsIgnoreCase(relationType)) {
                        // ONE_TO_MANY from U to V means V is MANY_TO_ONE to U
                        relationType = "MANY_TO_ONE";
                        isOwner = true;
                        mappedBy = null;
                    } else if ("MANY_TO_MANY".equalsIgnoreCase(relationType)) {
                        isOwner = false;
                        mappedBy = rel.getFromField();
                    }
                }

                // If not bidirectional and we are on the 'to' side, skip generating the field!
                if (!isBidirectional && isTo) {
                    continue;
                }

                relMap.put("relationType", relationType);
                relMap.put("targetType", targetType);
                relMap.put("fieldName", fieldName);
                relMap.put("targetIdType", entityIdTypes.getOrDefault(targetType, "Long"));
                relMap.put("owner", isOwner);
                relMap.put("mappedBy", mappedBy);
                relMap.put("otherFieldName", otherFieldName);
                relMap.put("nullable", isNullable);
                relMap.put("cascadeTypes", cascadeTypes);
                relMap.put("targetRepositoryName", targetType + "Repository");

                // Database Column Names for Join
                relMap.put("joinColumnName", toSnakeCase(fieldName) + "_id");
                relMap.put("inverseJoinColumnName", toSnakeCase(targetType) + "_id");
                
                String joinTableOverride = rel.getJoinTable();
                relMap.put("joinTableName", (joinTableOverride != null && !joinTableOverride.trim().isEmpty())
                        ? joinTableOverride.trim() : toSnakeCase(rel.getFrom()) + "_" + toSnakeCase(rel.getTo()));

                relationsList.add(relMap);
                relationshipFields.add(fieldName);

                // Add repository dependency for injection
                if (!relatedReposSet.contains(targetType)) {
                    relatedReposSet.add(targetType);
                    Map<String, Object> repoMap = new HashMap<>();
                    repoMap.put("repositoryType", targetType + "Repository");
                    repoMap.put("repositoryName", targetType.substring(0, 1).toLowerCase() + targetType.substring(1) + "Repository");
                    repoMap.put("entityType", targetType);
                    relationRepositoriesList.add(repoMap);
                }
            }
        }

        model.put("relations", relationsList);
        model.put("relationRepositories", relationRepositoriesList);
        model.put("relationshipFields", relationshipFields);

        return model;
    }

    private String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
    }
}
