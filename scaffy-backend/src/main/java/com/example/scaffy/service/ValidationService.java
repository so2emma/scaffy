package com.example.scaffy.service;

import com.example.scaffy.model.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class ValidationService {

    private static final Pattern PACKAGE_PATTERN = Pattern.compile("^[a-z]+(\\.[a-z0-9]+)*$");
    private static final Pattern PASCAL_CASE = Pattern.compile("^[A-Z][a-zA-Z0-9]*$");
    private static final Pattern CAMEL_CASE = Pattern.compile("^[a-z][a-zA-Z0-9]*$");

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "String", "Integer", "Long", "UUID", "Boolean",
            "LocalDate", "LocalDateTime", "BigDecimal", "Enum"
    );

    public List<ValidationErrorDto> validate(DiagramDto diagram) {
        List<ValidationErrorDto> errors = new ArrayList<>();

        if (diagram == null) {
            errors.add(ValidationErrorDto.builder()
                    .type("SCHEMA")
                    .target("diagram")
                    .message("Diagram payload is empty")
                    .build());
            return errors;
        }

        // 1. Base Package Validation
        if (diagram.getBasePackage() == null || diagram.getBasePackage().trim().isEmpty()) {
            errors.add(ValidationErrorDto.builder()
                    .type("SCHEMA")
                    .target("basePackage")
                    .message("Base package is required")
                    .build());
        } else if (!PACKAGE_PATTERN.matcher(diagram.getBasePackage()).matches()) {
            errors.add(ValidationErrorDto.builder()
                    .type("SCHEMA")
                    .target("basePackage")
                    .property("basePackage")
                    .message("Base package must be a valid lowercase Java package name (e.g. com.example.project)")
                    .build());
        }

        // 2. Project Name Validation
        if (diagram.getProjectName() == null || diagram.getProjectName().trim().isEmpty()) {
            errors.add(ValidationErrorDto.builder()
                    .type("SCHEMA")
                    .target("projectName")
                    .message("Project name is required")
                    .build());
        }

        if (diagram.getEntities() == null || diagram.getEntities().isEmpty()) {
            errors.add(ValidationErrorDto.builder()
                    .type("SCHEMA")
                    .target("entities")
                    .message("At least one entity must be designed")
                    .build());
            return errors;
        }

        Map<String, EntityDto> entityMap = new HashMap<>();
        Set<String> duplicateEntities = new HashSet<>();

        // 3. Entity level validation
        for (EntityDto entity : diagram.getEntities()) {
            if (entity.getName() == null || entity.getName().trim().isEmpty()) {
                errors.add(ValidationErrorDto.builder()
                        .type("ENTITY")
                        .target("Unknown")
                        .message("Entity name is missing")
                        .build());
                continue;
            }

            String entityName = entity.getName().trim();
            if (!PASCAL_CASE.matcher(entityName).matches()) {
                errors.add(ValidationErrorDto.builder()
                        .type("ENTITY")
                        .target(entityName)
                        .property("name")
                        .message("Entity name must be in PascalCase")
                        .build());
            }

            String lowerName = entityName.toLowerCase();
            if (entityMap.containsKey(lowerName)) {
                duplicateEntities.add(entityName);
                errors.add(ValidationErrorDto.builder()
                        .type("ENTITY")
                        .target(entityName)
                        .property("name")
                        .message("Duplicate entity name detected: " + entityName)
                        .build());
            } else {
                entityMap.put(lowerName, entity);
            }

            // Entity attributes validation
            if (entity.getAttributes() == null || entity.getAttributes().isEmpty()) {
                errors.add(ValidationErrorDto.builder()
                        .type("ENTITY")
                        .target(entityName)
                        .message("Entity must have at least one attribute")
                        .build());
                continue;
            }

            boolean hasPrimaryKey = false;
            Set<String> attributeNames = new HashSet<>();

            for (AttributeDto attribute : entity.getAttributes()) {
                if (attribute.getName() == null || attribute.getName().trim().isEmpty()) {
                    errors.add(ValidationErrorDto.builder()
                            .type("ATTRIBUTE")
                            .target(entityName)
                            .message("Attribute name is missing in entity: " + entityName)
                            .build());
                    continue;
                }

                String attrName = attribute.getName().trim();
                if (!CAMEL_CASE.matcher(attrName).matches()) {
                    errors.add(ValidationErrorDto.builder()
                            .type("ATTRIBUTE")
                            .target(entityName)
                            .property(attrName)
                            .message("Attribute name '" + attrName + "' must be in camelCase")
                            .build());
                }

                if (attributeNames.contains(attrName.toLowerCase())) {
                    errors.add(ValidationErrorDto.builder()
                            .type("ATTRIBUTE")
                            .target(entityName)
                            .property(attrName)
                            .message("Duplicate attribute name '" + attrName + "' in entity: " + entityName)
                            .build());
                } else {
                    attributeNames.add(attrName.toLowerCase());
                }

                if (attribute.isPrimaryKey()) {
                    hasPrimaryKey = true;
                }

                if (attribute.getType() == null || attribute.getType().trim().isEmpty()) {
                    errors.add(ValidationErrorDto.builder()
                            .type("ATTRIBUTE")
                            .target(entityName)
                            .property(attrName)
                            .message("Type is missing for attribute '" + attrName + "'")
                            .build());
                } else if (!ALLOWED_TYPES.contains(attribute.getType())) {
                    errors.add(ValidationErrorDto.builder()
                            .type("ATTRIBUTE")
                            .target(entityName)
                            .property(attrName)
                            .message("Invalid type '" + attribute.getType() + "' for attribute '" + attrName + "'. Allowed: " + ALLOWED_TYPES)
                            .build());
                } else if ("Enum".equals(attribute.getType())) {
                    if (attribute.getEnumValues() == null || attribute.getEnumValues().isEmpty()) {
                        errors.add(ValidationErrorDto.builder()
                                .type("ATTRIBUTE")
                                .target(entityName)
                                .property(attrName)
                                .message("Enum attribute '" + attrName + "' must specify at least one enum value in enumValues")
                                .build());
                    }
                }
            }

            if (!hasPrimaryKey) {
                errors.add(ValidationErrorDto.builder()
                        .type("ENTITY")
                        .target(entityName)
                        .message("Missing primary key. Entity '" + entityName + "' must have at least one attribute marked as primaryKey")
                        .build());
            }
        }

        // 4. Relationship Validation
        if (diagram.getRelationships() != null) {
            for (int i = 0; i < diagram.getRelationships().size(); i++) {
                RelationshipDto rel = diagram.getRelationships().get(i);
                String relLabel = "Relationship #" + (i + 1) + " (" + rel.getFrom() + " -> " + rel.getTo() + ")";

                // check from/to entities exist
                boolean fromExists = rel.getFrom() != null && entityMap.containsKey(rel.getFrom().toLowerCase());
                boolean toExists = rel.getTo() != null && entityMap.containsKey(rel.getTo().toLowerCase());

                if (rel.getFrom() == null || rel.getFrom().trim().isEmpty()) {
                    errors.add(ValidationErrorDto.builder()
                            .type("RELATIONSHIP")
                            .target(relLabel)
                            .property("from")
                            .message("Relationship source entity ('from') is missing")
                            .build());
                } else if (!fromExists) {
                    errors.add(ValidationErrorDto.builder()
                            .type("RELATIONSHIP")
                            .target(relLabel)
                            .property("from")
                            .message("Dangling relationship source: entity '" + rel.getFrom() + "' does not exist")
                            .build());
                }

                if (rel.getTo() == null || rel.getTo().trim().isEmpty()) {
                    errors.add(ValidationErrorDto.builder()
                            .type("RELATIONSHIP")
                            .target(relLabel)
                            .property("to")
                            .message("Relationship target entity ('to') is missing")
                            .build());
                } else if (!toExists) {
                    errors.add(ValidationErrorDto.builder()
                            .type("RELATIONSHIP")
                            .target(relLabel)
                            .property("to")
                            .message("Dangling relationship target: entity '" + rel.getTo() + "' does not exist")
                            .build());
                }

                if (rel.getType() == null || rel.getType().trim().isEmpty()) {
                    errors.add(ValidationErrorDto.builder()
                            .type("RELATIONSHIP")
                            .target(relLabel)
                            .property("type")
                            .message("Relationship type is missing")
                            .build());
                } else {
                    String type = rel.getType().toUpperCase();
                    if (!type.equals("ONE_TO_ONE") && !type.equals("ONE_TO_MANY") && !type.equals("MANY_TO_ONE") && !type.equals("MANY_TO_MANY")) {
                        errors.add(ValidationErrorDto.builder()
                                .type("RELATIONSHIP")
                                .target(relLabel)
                                .property("type")
                                .message("Invalid relationship type: " + rel.getType())
                                .build());
                    }
                }

                // validate fromField
                if (rel.getFromField() == null || rel.getFromField().trim().isEmpty()) {
                    errors.add(ValidationErrorDto.builder()
                            .type("RELATIONSHIP")
                            .target(relLabel)
                            .property("fromField")
                            .message("Field name in source entity is required")
                            .build());
                } else {
                    String fromField = rel.getFromField().trim();
                    if (!CAMEL_CASE.matcher(fromField).matches()) {
                        errors.add(ValidationErrorDto.builder()
                                .type("RELATIONSHIP")
                                .target(relLabel)
                                .property("fromField")
                                .message("fromField '" + fromField + "' must be in camelCase")
                                .build());
                    }
                    // check conflict with attributes in 'from'
                    if (fromExists) {
                        EntityDto fromEntity = entityMap.get(rel.getFrom().toLowerCase());
                        boolean conflict = fromEntity.getAttributes().stream()
                                .anyMatch(a -> a.getName().equalsIgnoreCase(fromField));
                        if (conflict) {
                            errors.add(ValidationErrorDto.builder()
                                    .type("RELATIONSHIP")
                                    .target(relLabel)
                                    .property("fromField")
                                    .message("Relationship field '" + fromField + "' in entity '" + rel.getFrom() + "' conflicts with an existing attribute name")
                                    .build());
                        }
                    }
                }

                // validate toField (if bidirectional)
                if (rel.getToField() != null && !rel.getToField().trim().isEmpty()) {
                    String toField = rel.getToField().trim();
                    if (!CAMEL_CASE.matcher(toField).matches()) {
                        errors.add(ValidationErrorDto.builder()
                                .type("RELATIONSHIP")
                                .target(relLabel)
                                .property("toField")
                                .message("toField '" + toField + "' must be in camelCase")
                                .build());
                    }
                    // check conflict with attributes in 'to'
                    if (toExists) {
                        EntityDto toEntity = entityMap.get(rel.getTo().toLowerCase());
                        boolean conflict = toEntity.getAttributes().stream()
                                .anyMatch(a -> a.getName().equalsIgnoreCase(toField));
                        if (conflict) {
                            errors.add(ValidationErrorDto.builder()
                                    .type("RELATIONSHIP")
                                    .target(relLabel)
                                    .property("toField")
                                    .message("Relationship field '" + toField + "' in entity '" + rel.getTo() + "' conflicts with an existing attribute name")
                                    .build());
                        }
                    }
                }
            }
        }

        // 5. Circular Mandatory Relationships check
        if (errors.isEmpty()) {
            List<ValidationErrorDto> circularErrors = checkCircularMandatoryRelationships(diagram);
            errors.addAll(circularErrors);
        }

        return errors;
    }

    private List<ValidationErrorDto> checkCircularMandatoryRelationships(DiagramDto diagram) {
        List<ValidationErrorDto> errors = new ArrayList<>();
        if (diagram.getRelationships() == null || diagram.getRelationships().isEmpty()) {
            return errors;
        }

        // Build dependency graph where:
        // Key: Entity name (lowercase)
        // Value: List of Dependency objects representing mandatory references to other entities
        Map<String, List<Dependency>> adjList = new HashMap<>();
        for (EntityDto entity : diagram.getEntities()) {
            adjList.put(entity.getName().toLowerCase(), new ArrayList<>());
        }

        for (RelationshipDto rel : diagram.getRelationships()) {
            String from = rel.getFrom().toLowerCase();
            String to = rel.getTo().toLowerCase();
            String type = rel.getType();

            boolean fromMandatory = rel.getFromNullable() != null && !rel.getFromNullable();
            boolean toMandatory = rel.getToNullable() != null && !rel.getToNullable();

            if ("ONE_TO_ONE".equalsIgnoreCase(type)) {
                if (fromMandatory) {
                    // 'from' cannot exist without 'to', so 'from' depends on 'to'
                    adjList.get(from).add(new Dependency(rel.getFrom(), rel.getTo(), rel.getFromField()));
                }
                if (toMandatory && rel.getToField() != null && !rel.getToField().trim().isEmpty()) {
                    // 'to' cannot exist without 'from', so 'to' depends on 'from'
                    adjList.get(to).add(new Dependency(rel.getTo(), rel.getFrom(), rel.getToField()));
                }
            } else if ("MANY_TO_ONE".equalsIgnoreCase(type)) {
                if (fromMandatory) {
                    // 'from' (many) has a foreign key to 'to' (one) and it cannot be null.
                    // So 'from' depends on 'to'
                    adjList.get(from).add(new Dependency(rel.getFrom(), rel.getTo(), rel.getFromField()));
                }
            } else if ("ONE_TO_MANY".equalsIgnoreCase(type)) {
                if (toMandatory) {
                    // 'to' (many) has a foreign key to 'from' (one) and it cannot be null.
                    // So 'to' depends on 'from'
                    adjList.get(to).add(new Dependency(rel.getTo(), rel.getFrom(), rel.getToField()));
                }
            }
            // Note: MANY_TO_MANY relations do not block initial insert in database as they are resolved
            // through a separate join table, so they are not mandatory insert dependencies.
        }

        // Detect cycles in directed graph using DFS
        Set<String> visited = new HashSet<>();
        Set<String> recStack = new HashSet<>();
        List<Dependency> path = new ArrayList<>();

        for (String entityNode : adjList.keySet()) {
            if (!visited.contains(entityNode)) {
                if (dfsDetectCycle(entityNode, adjList, visited, recStack, path, errors)) {
                    // cycle errors populated inside dfs
                }
            }
        }

        return errors;
    }

    private boolean dfsDetectCycle(String node, Map<String, List<Dependency>> adjList,
                                   Set<String> visited, Set<String> recStack, List<Dependency> path,
                                   List<ValidationErrorDto> errors) {
        visited.add(node);
        recStack.add(node);

        List<Dependency> neighbors = adjList.get(node);
        if (neighbors != null) {
            for (Dependency dep : neighbors) {
                String neighborKey = dep.target.toLowerCase();
                path.add(dep);

                if (recStack.contains(neighborKey)) {
                    // Found a cycle of mandatory relationships!
                    // Construct a cycle trace string
                    StringBuilder trace = new StringBuilder();
                    int startIndex = -1;
                    for (int i = 0; i < path.size(); i++) {
                        if (path.get(i).source.equalsIgnoreCase(neighborKey)) {
                            startIndex = i;
                            break;
                        }
                    }

                    if (startIndex != -1) {
                        for (int i = startIndex; i < path.size(); i++) {
                            Dependency step = path.get(i);
                            trace.append(step.source).append(".").append(step.field)
                                    .append(" -> ");
                        }
                        trace.append(dep.target);
                    } else {
                        trace.append(dep.source).append(" -> ").append(dep.target);
                    }

                    errors.add(ValidationErrorDto.builder()
                            .type("RELATIONSHIP")
                            .target(dep.source)
                            .property(dep.field)
                            .message("Circular mandatory relationship cycle detected: " + trace + ". At least one reference in this cycle must be made nullable.")
                            .build());

                    path.remove(path.size() - 1);
                    return true;
                }

                if (!visited.contains(neighborKey)) {
                    if (dfsDetectCycle(neighborKey, adjList, visited, recStack, path, errors)) {
                        return true;
                    }
                }

                path.remove(path.size() - 1);
            }
        }

        recStack.remove(node);
        return false;
    }

    private static class Dependency {
        String source;
        String target;
        String field;

        Dependency(String source, String target, String field) {
            this.source = source;
            this.target = target;
            this.field = field;
        }
    }
}
