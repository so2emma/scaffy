package com.example.scaffy.service.impl;

import com.example.scaffy.model.*;
import com.example.scaffy.service.ReverseEngineeringService;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ReverseEngineeringServiceImpl implements ReverseEngineeringService {

    @Override
    public DiagramDto parseDdl(String ddl) {
        DiagramDto diagram = new DiagramDto();
        diagram.setProjectName("ImportedDdlProject");
        diagram.setBasePackage("com.example.imported");
        diagram.setOpenApiSupport(false);
        diagram.setGenerateTestStubs(false);
        diagram.setFlywayMigration(true);

        List<EntityDto> entities = new ArrayList<>();
        List<RelationshipDto> relationships = new ArrayList<>();

        // Clean comments and extra statements
        String cleaned = ddl.replaceAll("(?s)/\\*.*?\\*/", "")
                            .replaceAll("--.*?\n", "\n")
                            .replaceAll("(?i)CREATE\\s+SEQUENCE.*?;", "")
                            .replaceAll("(?i)ALTER\\s+SEQUENCE.*?;", "");

        String[] statements = cleaned.split(";");
        Map<String, EntityDto> tableToEntity = new HashMap<>();

        // Parse Create Table
        for (String stmt : statements) {
            stmt = stmt.trim();
            if (stmt.isEmpty()) continue;

            if (stmt.toUpperCase().startsWith("CREATE TABLE")) {
                parseCreateTable(stmt, entities, tableToEntity, relationships);
            }
        }

        // Parse Alter Table ADD CONSTRAINT/FOREIGN KEY
        for (String stmt : statements) {
            stmt = stmt.trim();
            if (stmt.isEmpty()) continue;

            if (stmt.toUpperCase().startsWith("ALTER TABLE")) {
                parseAlterTable(stmt, tableToEntity, relationships);
            }
        }

        // Convert join-tables (having only foreign key columns) into MANY_TO_MANY edges
        List<EntityDto> nonJoinEntities = new ArrayList<>();
        for (EntityDto entity : entities) {
            boolean isJoin = isLikelyJoinTable(entity);
            if (isJoin) {
                convertJoinTableToRelationship(entity, relationships);
            } else {
                nonJoinEntities.add(entity);
            }
        }

        // Verify relationships point to existing entities and set fields
        List<RelationshipDto> validRelationships = new ArrayList<>();
        for (RelationshipDto rel : relationships) {
            boolean fromExists = nonJoinEntities.stream().anyMatch(e -> e.getName().equalsIgnoreCase(rel.getFrom()));
            boolean toExists = nonJoinEntities.stream().anyMatch(e -> e.getName().equalsIgnoreCase(rel.getTo()));
            if (fromExists && toExists) {
                // Ensure proper casing matches the actual Entity names
                String actualFrom = nonJoinEntities.stream().filter(e -> e.getName().equalsIgnoreCase(rel.getFrom())).findFirst().get().getName();
                String actualTo = nonJoinEntities.stream().filter(e -> e.getName().equalsIgnoreCase(rel.getTo())).findFirst().get().getName();
                rel.setFrom(actualFrom);
                rel.setTo(actualTo);
                validRelationships.add(rel);
            }
        }

        diagram.setEntities(nonJoinEntities);
        diagram.setRelationships(validRelationships);
        return diagram;
    }

    @Override
    public DiagramDto scanSpringBootProject(String projectPath) {
        File root = new File(projectPath);
        if (!root.exists() || !root.isDirectory()) {
            throw new IllegalArgumentException("Project directory does not exist or is not a directory.");
        }

        List<File> javaFiles = new ArrayList<>();
        findJavaFiles(root, javaFiles);

        DiagramDto diagram = new DiagramDto();
        diagram.setProjectName(root.getName());
        diagram.setBasePackage("com.example");
        diagram.setOpenApiSupport(false);


        Map<String, List<String>> parsedEnums = new HashMap<>();
        for (File file : javaFiles) {
            String content = readFile(file);
            if (content.contains("enum ")) {
                parseJavaEnum(content, parsedEnums);
            }
        }

        List<EntityDto> entities = new ArrayList<>();
        List<RelationshipDto> relationships = new ArrayList<>();

        // Parse Entity classes
        for (File file : javaFiles) {
            String content = readFile(file);
            if (content.contains("@Entity")) {
                EntityDto entity = parseJavaEntity(content, relationships, parsedEnums);
                if (entity != null) {
                    entities.add(entity);
                }
            }
        }

        // Refine base package from first entity class package declaration
        for (File file : javaFiles) {
            String content = readFile(file);
            if (content.contains("@Entity")) {
                Pattern pkgPattern = Pattern.compile("package\\s+([\\w.]+);");
                Matcher m = pkgPattern.matcher(content);
                if (m.find()) {
                    String pkg = m.group(1);
                    if (pkg.contains(".entity") || pkg.contains(".model")) {
                        pkg = pkg.replaceAll("\\.(entity|model)$", "");
                    }
                    diagram.setBasePackage(pkg);
                    break;
                }
            }
        }

        // Verify relationships point to existing entities
        List<RelationshipDto> uniqueRelationships = filterDuplicateRelationships(relationships);
        List<RelationshipDto> validRelationships = new ArrayList<>();
        for (RelationshipDto rel : uniqueRelationships) {
            boolean fromExists = entities.stream().anyMatch(e -> e.getName().equalsIgnoreCase(rel.getFrom()));
            boolean toExists = entities.stream().anyMatch(e -> e.getName().equalsIgnoreCase(rel.getTo()));
            if (fromExists && toExists) {
                String actualFrom = entities.stream().filter(e -> e.getName().equalsIgnoreCase(rel.getFrom())).findFirst().get().getName();
                String actualTo = entities.stream().filter(e -> e.getName().equalsIgnoreCase(rel.getTo())).findFirst().get().getName();
                rel.setFrom(actualFrom);
                rel.setTo(actualTo);
                validRelationships.add(rel);
            }
        }

        diagram.setEntities(entities);
        diagram.setRelationships(validRelationships);
        return diagram;
    }

    private void findJavaFiles(File directory, List<File> files) {
        File[] list = directory.listFiles();
        if (list == null) return;
        for (File file : list) {
            if (file.isDirectory()) {
                findJavaFiles(file, files);
            } else if (file.getName().endsWith(".java")) {
                files.add(file);
            }
        }
    }

    private String readFile(File file) {
        try {
            return Files.readString(file.toPath());
        } catch (IOException e) {
            return "";
        }
    }

    // --- SQL DDL Parser Helpers ---

    private void parseCreateTable(String stmt, List<EntityDto> entities, Map<String, EntityDto> tableToEntity, List<RelationshipDto> relationships) {
        Pattern tablePattern = Pattern.compile("(?i)CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?([\\w`\".]+)\\s*\\((.*)\\)", Pattern.DOTALL);
        Matcher matcher = tablePattern.matcher(stmt);
        if (!matcher.find()) return;

        String tableName = cleanIdentifier(matcher.group(1));
        String body = matcher.group(2);

        EntityDto entity = new EntityDto();
        entity.setTableName(tableName);
        entity.setName(capitalize(camelCase(tableName)));
        entity.setSoftDelete(false);

        List<AttributeDto> attributes = new ArrayList<>();
        List<String> lines = splitByCommaOutsideParentheses(body);
        List<String> primaryKeyColumns = new ArrayList<>();

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;

            String upperLine = line.toUpperCase();

            // Table-level PK
            if (upperLine.startsWith("PRIMARY KEY")) {
                primaryKeyColumns.addAll(extractConstraintColumns(line));
                continue;
            } else if (upperLine.startsWith("CONSTRAINT") && upperLine.contains("PRIMARY KEY")) {
                primaryKeyColumns.addAll(extractConstraintColumns(line.substring(line.indexOf("PRIMARY KEY"))));
                continue;
            }

            // Table-level FK
            if (upperLine.startsWith("FOREIGN KEY") || (upperLine.startsWith("CONSTRAINT") && upperLine.contains("FOREIGN KEY"))) {
                parseTableLevelForeignKey(tableName, line, relationships);
                continue;
            }

            // Column-level definition
            String[] parts = line.split("\\s+", 2);
            if (parts.length < 2) continue;

            String colName = cleanIdentifier(parts[0]);
            String rest = parts[1];
            String typeStr = rest.split("\\s+")[0].replaceAll("\\(.*\\)", "");

            AttributeDto attr = new AttributeDto();
            attr.setName(camelCase(colName));

            String upperRest = rest.toUpperCase();
            if (upperRest.startsWith("ENUM")) {
                attr.setType("Enum");
                List<String> enumValues = new ArrayList<>();
                int openIndex = rest.indexOf("(");
                int closeIndex = rest.indexOf(")");
                if (openIndex != -1 && closeIndex != -1 && closeIndex > openIndex) {
                    String enumBody = rest.substring(openIndex + 1, closeIndex);
                    Pattern valPattern = Pattern.compile("'([^']+)'");
                    Matcher valMatcher = valPattern.matcher(enumBody);
                    while (valMatcher.find()) {
                        enumValues.add(valMatcher.group(1));
                    }
                }
                attr.setEnumValues(enumValues);
            } else {
                attr.setType(mapSqlTypeToJava(typeStr));
            }

            boolean isPk = upperRest.contains("PRIMARY KEY");
            if (isPk) {
                primaryKeyColumns.add(colName);
            }
            attr.setPrimaryKey(isPk);
            attr.setNullable(!upperRest.contains("NOT NULL"));
            attr.setUnique(upperRest.contains("UNIQUE"));

            // Check validation size
            ValidationConfigDto val = new ValidationConfigDto();
            boolean hasVal = false;
            if (upperRest.contains("NOT NULL")) {
                val.setRequired(true);
                hasVal = true;
            }
            if (rest.contains("(") && rest.contains(")")) {
                Pattern sizePattern = Pattern.compile("\\((\\d+)\\)");
                Matcher sizeMatcher = sizePattern.matcher(rest);
                if (sizeMatcher.find()) {
                    int size = Integer.parseInt(sizeMatcher.group(1));
                    if (typeStr.equalsIgnoreCase("VARCHAR") || typeStr.equalsIgnoreCase("CHAR") || typeStr.equalsIgnoreCase("TEXT")) {
                        val.setMaxSize(size);
                        hasVal = true;
                    }
                }
            }

            if (hasVal) {
                attr.setValidation(val);
            }

            if (colName.equalsIgnoreCase("deleted_at") || colName.equalsIgnoreCase("deletedat")) {
                entity.setSoftDelete(true);
            } else {
                attributes.add(attr);
            }
        }

        // Apply table-level PKs
        for (AttributeDto attr : attributes) {
            String colName = snakeCase(attr.getName());
            if (primaryKeyColumns.contains(colName)) {
                attr.setPrimaryKey(true);
                attr.setNullable(false);
            }
        }

        entity.setAttributes(attributes);
        entities.add(entity);
        tableToEntity.put(tableName, entity);
    }

    private void parseAlterTable(String stmt, Map<String, EntityDto> tableToEntity, List<RelationshipDto> relationships) {
        // ALTER TABLE books ADD FOREIGN KEY (author_id) REFERENCES authors(id)
        Pattern alterPattern = Pattern.compile("(?i)ALTER\\s+TABLE\\s+([\\w`\".]+)\\s+ADD\\s+(?:CONSTRAINT\\s+\\w+\\s+)?FOREIGN\\s+KEY\\s*\\(([\\w`\"\\s,]+)\\)\\s*REFERENCES\\s*([\\w`\".]+)\\s*\\(([\\w`\"\\s,]+)\\)", Pattern.DOTALL);
        Matcher matcher = alterPattern.matcher(stmt);
        if (!matcher.find()) return;

        String sourceTable = cleanIdentifier(matcher.group(1));
        String fromCol = cleanIdentifier(matcher.group(2));
        String targetTable = cleanIdentifier(matcher.group(3));

        RelationshipDto rel = new RelationshipDto();
        rel.setFrom(capitalize(camelCase(sourceTable)));
        rel.setTo(capitalize(camelCase(targetTable)));
        rel.setType("MANY_TO_ONE");
        rel.setFromField(camelCase(fromCol.replaceAll("(?i)_id$", "")));
        rel.setToField(getPluralFieldName(camelCase(sourceTable)));
        rel.setFromNullable(true);
        rel.setToNullable(true);
        rel.setCascade(Arrays.asList("PERSIST", "MERGE"));

        relationships.add(rel);
    }

    private void parseTableLevelForeignKey(String sourceTable, String line, List<RelationshipDto> relationships) {
        Pattern fkPattern = Pattern.compile("(?i)FOREIGN\\s+KEY\\s*\\(([\\w`\"\\s,]+)\\)\\s*REFERENCES\\s*([\\w`\".]+)\\s*\\(([\\w`\"\\s,]+)\\)", Pattern.DOTALL);
        Matcher matcher = fkPattern.matcher(line);
        if (!matcher.find()) return;

        String fromCol = cleanIdentifier(matcher.group(1));
        String targetTable = cleanIdentifier(matcher.group(2));

        RelationshipDto rel = new RelationshipDto();
        rel.setFrom(capitalize(camelCase(sourceTable)));
        rel.setTo(capitalize(camelCase(targetTable)));
        rel.setType("MANY_TO_ONE");
        rel.setFromField(camelCase(fromCol.replaceAll("(?i)_id$", "")));
        rel.setToField(getPluralFieldName(camelCase(sourceTable)));
        rel.setFromNullable(!line.toUpperCase().contains("NOT NULL"));
        rel.setToNullable(true);
        rel.setCascade(Arrays.asList("PERSIST", "MERGE"));

        relationships.add(rel);
    }

    private boolean isLikelyJoinTable(EntityDto entity) {
        List<AttributeDto> attrs = entity.getAttributes();
        int size = attrs.size();
        if (size != 2 && size != 3) return false;

        int fkCount = 0;
        for (AttributeDto attr : attrs) {
            if (attr.isPrimaryKey() && size == 3) continue;
            String name = attr.getName().toLowerCase();
            if (name.endsWith("id") && !name.equals("id")) {
                fkCount++;
            }
        }
        return fkCount == 2;
    }

    private void convertJoinTableToRelationship(EntityDto joinEntity, List<RelationshipDto> relationships) {
        String joinClassName = joinEntity.getName();
        List<RelationshipDto> joinFks = new ArrayList<>();
        for (RelationshipDto rel : relationships) {
            if (rel.getFrom().equalsIgnoreCase(joinClassName)) {
                joinFks.add(rel);
            }
        }
        if (joinFks.size() < 2) return;

        RelationshipDto fk1 = joinFks.get(0);
        RelationshipDto fk2 = joinFks.get(1);

        RelationshipDto rel = new RelationshipDto();
        rel.setFrom(fk1.getTo());
        rel.setTo(fk2.getTo());
        rel.setType("MANY_TO_MANY");
        rel.setFromField(getPluralFieldName(fk2.getTo()));
        rel.setToField(getPluralFieldName(fk1.getTo()));
        rel.setFromNullable(true);
        rel.setToNullable(true);
        rel.setCascade(Arrays.asList("PERSIST", "MERGE"));
        rel.setJoinTable(joinEntity.getTableName());

        relationships.add(rel);
    }

    private String getPluralFieldName(String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith("s")) {
            return lower;
        }
        return lower + "s";
    }

    private List<String> splitByCommaOutsideParentheses(String body) {
        List<String> result = new ArrayList<>();
        int depth = 0;
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (c == '(') depth++;
            else if (c == ')') depth--;

            if (c == ',' && depth == 0) {
                result.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        if (current.length() > 0) {
            result.add(current.toString());
        }
        return result;
    }

    private List<String> extractConstraintColumns(String line) {
        List<String> cols = new ArrayList<>();
        Pattern p = Pattern.compile("\\(([^)]+)\\)");
        Matcher m = p.matcher(line);
        if (m.find()) {
            String[] parts = m.group(1).split(",");
            for (String part : parts) {
                cols.add(cleanIdentifier(part));
            }
        }
        return cols;
    }

    private String mapSqlTypeToJava(String sqlType) {
        sqlType = sqlType.toUpperCase();
        if (sqlType.contains("CHAR") || sqlType.contains("TEXT") || sqlType.equals("UUID")) {
            return "String";
        }
        if (sqlType.contains("BIGINT") || sqlType.contains("INT8")) {
            return "Long";
        }
        if (sqlType.contains("INT") || sqlType.contains("MEDIUMINT") || sqlType.contains("SMALLINT") || sqlType.contains("TINYINT")) {
            if (sqlType.equals("TINYINT(1)") || sqlType.equals("BOOLEAN") || sqlType.equals("BIT")) {
                return "Boolean";
            }
            return "Integer";
        }
        if (sqlType.contains("DECIMAL") || sqlType.contains("NUMERIC")) {
            return "BigDecimal";
        }
        if (sqlType.contains("DOUBLE") || sqlType.contains("FLOAT") || sqlType.contains("REAL")) {
            return "Double";
        }
        if (sqlType.contains("DATE")) {
            if (sqlType.contains("TIME") || sqlType.contains("TIMESTAMP")) {
                return "LocalDateTime";
            }
            return "LocalDate";
        }
        if (sqlType.contains("TIME") || sqlType.contains("TIMESTAMP")) {
            return "LocalDateTime";
        }
        if (sqlType.equals("BOOLEAN") || sqlType.equals("BIT")) {
            return "Boolean";
        }
        return "String";
    }

    private String snakeCase(String name) {
        if (name == null) return "";
        return name.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase();
    }

    private String camelCase(String name) {
        if (name == null) return "";
        name = name.toLowerCase();
        StringBuilder sb = new StringBuilder();
        boolean nextUpper = false;
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (c == '_' || c == '-' || c == ' ') {
                nextUpper = sb.length() > 0;
            } else {
                if (nextUpper) {
                    sb.append(Character.toUpperCase(c));
                    nextUpper = false;
                } else {
                    sb.append(c);
                }
            }
        }
        return sb.toString();
    }

    private String capitalize(String name) {
        if (name == null || name.isEmpty()) return "";
        return Character.toUpperCase(name.charAt(0)) + name.substring(1);
    }

    private String cleanIdentifier(String name) {
        if (name == null) return "";
        return name.replaceAll("[`\"'\\[\\]]", "").trim();
    }

    // --- Java Entity Parser Helpers ---

    private EntityDto parseJavaEntity(String content, List<RelationshipDto> relationships, Map<String, List<String>> parsedEnums) {
        Pattern classPattern = Pattern.compile("public\\s+class\\s+(\\w+)");
        Matcher classMatcher = classPattern.matcher(content);
        if (!classMatcher.find()) return null;

        String className = classMatcher.group(1);

        EntityDto entity = new EntityDto();
        entity.setName(className);

        Pattern tablePattern = Pattern.compile("@Table\\(\\s*name\\s*=\\s*\"([^\"]+)\"\\s*\\)");
        Matcher tableMatcher = tablePattern.matcher(content);
        if (tableMatcher.find()) {
            entity.setTableName(tableMatcher.group(1));
        }

        entity.setSoftDelete(content.contains("softDelete") || content.contains("deletedAt") || content.contains("deleted_at") || content.contains("@SQLDelete"));

        List<AttributeDto> attributes = new ArrayList<>();
        int braceIndex = content.indexOf("{");
        if (braceIndex == -1) return null;
        String classBody = content.substring(braceIndex + 1, content.lastIndexOf("}"));

        // Match annotations and field declarations
        Pattern fieldPattern = Pattern.compile("((?:@[\\w(\\s=\",.*)]+\\s*)*)(?:private|protected|public)\\s+([\\w.<>\\[\\]]+)\\s+(\\w+)\\s*(?:=\\s*[^;]+)?\\s*;", Pattern.MULTILINE);
        Matcher fm = fieldPattern.matcher(classBody);

        while (fm.find()) {
            String annotations = fm.group(1);
            String type = fm.group(2);
            String name = fm.group(3);

            if (annotations.contains("@OneToMany") || annotations.contains("@ManyToOne") || annotations.contains("@ManyToMany") || annotations.contains("@OneToOne")) {
                parseJavaRelationship(className, type, name, annotations, relationships);
                continue;
            }

            if (name.equals("serialVersionUID")) continue;
            if (type.contains("List") || type.contains("Set") || type.contains("Collection")) continue;

            AttributeDto attr = new AttributeDto();
            attr.setName(name);
            
            String mappedType = mapJavaTypeToSupportedType(type);
            if (mappedType.equals("String") && parsedEnums.containsKey(type)) {
                attr.setType("Enum");
                attr.setEnumValues(parsedEnums.get(type));
            } else if (annotations.contains("@Enumerated")) {
                attr.setType("Enum");
                attr.setEnumValues(Arrays.asList("PENDING", "APPROVED", "CANCELLED")); // fallback
            } else {
                attr.setType(mappedType);
            }
            
            attr.setPrimaryKey(annotations.contains("@Id"));
            attr.setNullable(true);
            attr.setUnique(false);

            if (annotations.contains("@Column")) {
                if (annotations.contains("nullable = false") || annotations.contains("nullable=false")) {
                    attr.setNullable(false);
                }
                if (annotations.contains("unique = true") || annotations.contains("unique=true")) {
                    attr.setUnique(true);
                }
            }

            ValidationConfigDto val = new ValidationConfigDto();
            boolean hasVal = false;
            if (annotations.contains("@NotNull")) {
                val.setRequired(true);
                hasVal = true;
            }
            if (annotations.contains("@Email")) {
                val.setEmail(true);
                hasVal = true;
            }
            if (annotations.contains("@Size")) {
                Pattern minP = Pattern.compile("min\\s*=\\s*(\\d+)");
                Matcher minM = minP.matcher(annotations);
                if (minM.find()) {
                    val.setMinSize(Integer.parseInt(minM.group(1)));
                    hasVal = true;
                }
                Pattern maxP = Pattern.compile("max\\s*=\\s*(\\d+)");
                Matcher maxM = maxP.matcher(annotations);
                if (maxM.find()) {
                    val.setMaxSize(Integer.parseInt(maxM.group(1)));
                    hasVal = true;
                }
            }

            if (hasVal) {
                attr.setValidation(val);
            }

            if (name.equalsIgnoreCase("deletedAt") || name.equalsIgnoreCase("deleted_at")) {
                entity.setSoftDelete(true);
            } else {
                attributes.add(attr);
            }
        }

        entity.setAttributes(attributes);
        return entity;
    }

    private void parseJavaRelationship(String className, String type, String fieldName, String annotations, List<RelationshipDto> relationships) {
        String relType = "MANY_TO_ONE";
        if (annotations.contains("@OneToMany")) {
            relType = "ONE_TO_MANY";
        } else if (annotations.contains("@ManyToMany")) {
            relType = "MANY_TO_MANY";
        } else if (annotations.contains("@OneToOne")) {
            relType = "ONE_TO_ONE";
        }

        String target = type;
        if (type.contains("<") && type.contains(">")) {
            target = type.substring(type.indexOf("<") + 1, type.indexOf(">"));
        }

        List<String> cascade = new ArrayList<>();
        if (annotations.contains("CascadeType.ALL")) {
            cascade.add("ALL");
        } else {
            if (annotations.contains("CascadeType.PERSIST")) cascade.add("PERSIST");
            if (annotations.contains("CascadeType.MERGE")) cascade.add("MERGE");
            if (annotations.contains("CascadeType.REMOVE")) cascade.add("REMOVE");
        }
        if (cascade.isEmpty()) {
            cascade.addAll(Arrays.asList("PERSIST", "MERGE"));
        }

        String joinTable = null;
        if (annotations.contains("@JoinTable")) {
            Pattern jtPattern = Pattern.compile("name\\s*=\\s*\"([^\"]+)\"");
            Matcher jtMatcher = jtPattern.matcher(annotations);
            if (jtMatcher.find()) {
                joinTable = jtMatcher.group(1);
            }
        }

        boolean isInverseSide = annotations.contains("mappedBy");
        if (isInverseSide) {
            for (RelationshipDto existing : relationships) {
                if (existing.getFrom().equalsIgnoreCase(target) && existing.getTo().equalsIgnoreCase(className)) {
                    existing.setToField(fieldName);
                    return;
                }
            }
        }

        RelationshipDto rel = new RelationshipDto();
        rel.setFrom(className);
        rel.setTo(target);
        rel.setType(relType);

        if (relType.equals("ONE_TO_MANY") || relType.equals("MANY_TO_MANY")) {
            rel.setFromField(fieldName);
            rel.setToField(relType.equals("MANY_TO_MANY") ? getPluralFieldName(className) : className.toLowerCase());
        } else {
            rel.setFromField(fieldName);
            rel.setToField(getPluralFieldName(className));
        }

        rel.setFromNullable(!annotations.contains("optional = false") && !annotations.contains("optional=false"));
        rel.setToNullable(true);
        rel.setCascade(cascade);
        rel.setJoinTable(joinTable);

        relationships.add(rel);
    }

    private String mapJavaTypeToSupportedType(String javaType) {
        if (javaType == null) return "String";
        javaType = javaType.trim();
        if (javaType.contains("<")) {
            javaType = javaType.substring(0, javaType.indexOf("<")).trim();
        }
        switch (javaType) {
            case "String":
            case "char":
            case "Character":
            case "UUID":
            case "java.util.UUID":
                return javaType.equals("java.util.UUID") ? "UUID" : javaType;
            case "int":
            case "Integer":
            case "short":
            case "Short":
            case "byte":
            case "Byte":
                return "Integer";
            case "long":
            case "Long":
                return "Long";
            case "boolean":
            case "Boolean":
                return "Boolean";
            case "double":
            case "Double":
            case "float":
            case "Float":
            case "BigDecimal":
            case "java.math.BigDecimal":
                return "BigDecimal";
            case "LocalDate":
            case "java.time.LocalDate":
            case "Date":
            case "java.util.Date":
            case "java.sql.Date":
                return "LocalDate";
            case "LocalDateTime":
            case "java.time.LocalDateTime":
            case "Instant":
            case "java.time.Instant":
            case "Timestamp":
            case "java.sql.Timestamp":
            case "OffsetDateTime":
            case "java.time.OffsetDateTime":
            case "ZonedDateTime":
            case "java.time.ZonedDateTime":
                return "LocalDateTime";
            default:
                return "String";
        }
    }

    private List<RelationshipDto> filterDuplicateRelationships(List<RelationshipDto> relationships) {
        List<RelationshipDto> filtered = new ArrayList<>();
        for (RelationshipDto rel : relationships) {
            boolean isDuplicate = false;
            for (RelationshipDto existing : filtered) {
                if ((existing.getFrom().equalsIgnoreCase(rel.getFrom()) && existing.getTo().equalsIgnoreCase(rel.getTo())) ||
                    (existing.getFrom().equalsIgnoreCase(rel.getTo()) && existing.getTo().equalsIgnoreCase(rel.getFrom()))) {
                    
                    isDuplicate = true;
                    
                    if (existing.getType().equals("ONE_TO_MANY") && rel.getType().equals("MANY_TO_ONE")) {
                        existing.setFrom(rel.getFrom());
                        existing.setTo(rel.getTo());
                        existing.setType("MANY_TO_ONE");
                        existing.setFromField(rel.getFromField());
                        existing.setToField(rel.getToField());
                    } else {
                        if (existing.getFrom().equalsIgnoreCase(rel.getTo())) {
                            if (existing.getToField() == null || existing.getToField().isEmpty()) {
                                existing.setToField(rel.getFromField());
                            }
                        } else {
                            if (existing.getToField() == null || existing.getToField().isEmpty()) {
                                existing.setToField(rel.getToField());
                            }
                        }
                    }
                    break;
                }
            }
            if (!isDuplicate) {
                filtered.add(rel);
            }
        }
        return filtered;
    }

    private void parseJavaEnum(String content, Map<String, List<String>> parsedEnums) {
        Pattern enumPattern = Pattern.compile("(?:public\\s+)?enum\\s+(\\w+)");
        Matcher matcher = enumPattern.matcher(content);
        if (!matcher.find()) return;
        String enumName = matcher.group(1);
        
        int braceIndex = content.indexOf("{", matcher.end());
        if (braceIndex == -1) return;
        
        String body = content.substring(braceIndex + 1);
        int semiIndex = body.indexOf(";");
        int closeBraceIndex = body.indexOf("}");
        
        int endIndex = body.length();
        if (semiIndex != -1 && closeBraceIndex != -1) {
            endIndex = Math.min(semiIndex, closeBraceIndex);
        } else if (semiIndex != -1) {
            endIndex = semiIndex;
        } else if (closeBraceIndex != -1) {
            endIndex = closeBraceIndex;
        }
        
        String constantsPart = body.substring(0, endIndex);
        constantsPart = constantsPart.replaceAll("//.*", "");
        constantsPart = constantsPart.replaceAll("/\\*.*?\\*/", "");
        
        String[] parts = constantsPart.split(",");
        List<String> values = new ArrayList<>();
        for (String part : parts) {
            part = part.trim();
            if (part.isEmpty()) continue;
            
            int parenIndex = part.indexOf("(");
            if (parenIndex != -1) {
                part = part.substring(0, parenIndex).trim();
            }
            
            if (part.matches("\\w+")) {
                values.add(part);
            }
        }
        
        if (!values.isEmpty()) {
            parsedEnums.put(enumName, values);
        }
    }
}
