package com.example.scaffy.service.impl;

import com.example.scaffy.model.*;
import com.example.scaffy.service.CodeGenerator;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.util.stream.Collectors;

@Component
public class GinCodeGenerator implements CodeGenerator {

    @Override
    public boolean supports(String framework) {
        return "GIN".equalsIgnoreCase(framework);
    }

    @Override
    public String getFrameworkId() {
        return "GIN";
    }

    @Override
    public String getDisplayName() {
        return "Gin (Go)";
    }

    @Override
    public String getLanguage() {
        return "Go";
    }

    @Override
    public String getDescription() {
        return "GORM · Gin Router · PostgreSQL";
    }

    @Override
    public String getColor() {
        return "#34d399";
    }

    @Override
    public List<FeatureDescriptor> getAvailableFeatures() {
        return List.of(
                new FeatureDescriptor("swagger", "Swagger Docs (swaggo)", "Swagger API documentation using swaggo", false),
                new FeatureDescriptor("goTests", "Go Test Stubs", "Generate unit/repository test stubs", false),
                new FeatureDescriptor("dockerFile", "Dockerfile + Compose", "Generate Dockerfile and docker-compose.yml", false),
                new FeatureDescriptor("envConfig", ".env Config (godotenv)", "Load configuration from .env files", true)
        );
    }

    @Override
    public byte[] generateZip(DiagramDto diagram) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            String projectFolder = toSnakeCase(diagram.getProjectName()) + "/";
            Map<String, String> files = generateAllFiles(diagram);
            for (Map.Entry<String, String> entry : files.entrySet()) {
                zos.putNextEntry(new ZipEntry(projectFolder + entry.getKey()));
                zos.write(entry.getValue().getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    @Override
    public Map<String, String> generatePreview(DiagramDto diagram, String entityName) throws Exception {
        Map<String, String> preview = new LinkedHashMap<>();
        EntityDto target = diagram.getEntities().stream()
                .filter(e -> e.getName().equalsIgnoreCase(entityName))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + entityName));

        Map<String, String> allFiles = generateAllFiles(diagram);
        String entitySnake = toSnakeCase(target.getName());

        preview.put("Model", allFiles.getOrDefault("internal/models/" + entitySnake + ".go", ""));
        preview.put("Handler", allFiles.getOrDefault("internal/handlers/" + entitySnake + "_handler.go", ""));
        preview.put("Repository", allFiles.getOrDefault("internal/repositories/" + entitySnake + "_repository.go", ""));
        preview.put("Routes", allFiles.getOrDefault("internal/routes/routes.go", ""));
        preview.put("Database", allFiles.getOrDefault("internal/database/database.go", ""));
        preview.put("Main", allFiles.getOrDefault("cmd/server/main.go", ""));
        preview.put("go.mod", allFiles.getOrDefault("go.mod", ""));

        return preview;
    }

    private Map<String, String> generateAllFiles(DiagramDto diagram) {
        Map<String, String> files = new HashMap<>();
        String moduleName = toSnakeCase(diagram.getProjectName());

        files.put("go.mod", generateGoMod(moduleName, diagram));
        files.put(".env.example", generateEnvExample(diagram));
        files.put("README.md", generateReadme(diagram));
        files.put("cmd/server/main.go", generateMain(moduleName, diagram));
        files.put("internal/config/config.go", generateConfig(moduleName));
        files.put("internal/database/database.go", generateDatabase(moduleName, diagram));
        files.put("internal/routes/routes.go", generateRoutes(moduleName, diagram));

        if (diagram.isFeatureEnabled("dockerFile")) {
            files.put("Dockerfile", generateDockerfile());
            files.put("docker-compose.yml", generateDockerCompose(diagram));
        }

        for (EntityDto entity : diagram.getEntities()) {
            String entitySnake = toSnakeCase(entity.getName());
            files.put("internal/models/" + entitySnake + ".go", generateModel(entity, diagram));
            files.put("internal/repositories/" + entitySnake + "_repository.go", generateRepository(moduleName, entity));
            files.put("internal/handlers/" + entitySnake + "_handler.go", generateHandler(moduleName, entity, diagram));

            if (diagram.isFeatureEnabled("goTests")) {
                files.put("internal/repositories/" + entitySnake + "_repository_test.go", generateRepositoryTest(moduleName, entity));
            }
        }

        return files;
    }

    private String generateGoMod(String moduleName, DiagramDto diagram) {
        boolean swagger = diagram.isFeatureEnabled("swagger");
        return """
                module %s
                
                go 1.20
                
                require (
                \tgithub.com/gin-gonic/gin v1.9.1
                \tgithub.com/joho/godotenv v1.5.1
                \tgorm.io/driver/postgres v1.5.2
                \tgorm.io/gorm v1.25.1
                %s)
                """.formatted(moduleName, swagger ? "\tgithub.com/swaggo/swag v1.16.2\n" : "");
    }

    private String generateEnvExample(DiagramDto diagram) {
        return """
                PORT=8080
                DATABASE_URL=postgres://postgres:postgres@localhost:5432/%s?sslmode=disable
                """.formatted(toSnakeCase(diagram.getProjectName()));
    }

    private String generateReadme(DiagramDto diagram) {
        return """
                # %s (Go Gin REST API)
                
                This project was scaffolded using Scaffy.
                
                ## Requirements
                - Go >= 1.20
                - PostgreSQL
                
                ## Getting Started
                1. Clone this repository
                2. Configure `.env` from `.env.example`
                3. Install dependencies: `go mod download`
                4. Run server: `go run cmd/server/main.go`
                """.formatted(diagram.getProjectName());
    }

    private String generateMain(String moduleName, DiagramDto diagram) {
        boolean env = diagram.isFeatureEnabled("envConfig");
        String envLoad = env ? """
                \t// Load .env file
                \tif err := godotenv.Load(); err != nil {
                \t\tlog.Println("No .env file found, using system environment variables")
                \t}
                """ : "";

        return """
                package main
                
                import (
                \t"log"
                \t"os"
                \t"github.com/gin-gonic/gin"
                \t"github.com/joho/godotenv"
                \t"%s/internal/database"
                \t"%s/internal/routes"
                )
                
                func main() {
                %s
                \t// Initialize Database
                \tdb := database.ConnectDB()
                
                \trouter := gin.Default()
                
                \t// Setup routes
                \troutes.SetupRoutes(router, db)
                
                \tport := os.Getenv("PORT")
                \tif port == "" {
                \t\tport = "8080"
                \t}
                
                \tlog.Printf("Server starting on port %%s", port)
                \tif err := router.Run(":" + port); err != nil {
                \t\tlog.Fatalf("Failed to run server: %%v", err)
                \t}
                }
                """.formatted(moduleName, moduleName, envLoad);
    }

    private String generateConfig(String moduleName) {
        return """
                package config
                
                import (
                \t"os"
                )
                
                type Config struct {
                \tPort        string
                \tDatabaseURL string
                }
                
                func Load() *Config {
                \tport := os.Getenv("PORT")
                \tif port == "" {
                \t\tport = "8080"
                \t}
                \tdbURL := os.Getenv("DATABASE_URL")
                \tif dbURL == "" {
                \t\tdbURL = "host=localhost user=postgres password=postgres dbname=postgres port=5432 sslmode=disable"
                \t}
                \treturn &Config{
                \t\tPort:        port,
                \t\tDatabaseURL: dbURL,
                \t}
                }
                """;
    }

    private String generateDatabase(String moduleName, DiagramDto diagram) {
        String modelsList = diagram.getEntities().stream()
                .map(e -> String.format("\t\t&models.%s{},", e.getName()))
                .collect(Collectors.joining("\n"));

        return """
                package database
                
                import (
                \t"log"
                \t"os"
                \t"gorm.io/driver/postgres"
                \t"gorm.io/gorm"
                \t"%s/internal/models"
                )
                
                func ConnectDB() *gorm.DB {
                \tdsn := os.Getenv("DATABASE_URL")
                \tif dsn == "" {
                \t\tdsn = "host=localhost user=postgres password=postgres dbname=postgres port=5432 sslmode=disable"
                \t}
                
                \tdb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
                \tif err != nil {
                \t\tlog.Fatalf("Failed to connect to database: %%v", err)
                \t}
                
                \t// Run auto-migrations
                \terr = db.AutoMigrate(
                %s
                \t)
                \tif err != nil {
                \t\tlog.Fatalf("Failed to run database auto-migrations: %%v", err)
                \t}
                
                \tlog.Println("Database connection successfully established and migrated")
                \treturn db
                }
                """.formatted(moduleName, modelsList);
    }

    private String generateRoutes(String moduleName, DiagramDto diagram) {
        StringBuilder initRepos = new StringBuilder();
        StringBuilder initHandlers = new StringBuilder();
        StringBuilder endpoints = new StringBuilder();

        for (EntityDto entity : diagram.getEntities()) {
            String snake = toSnakeCase(entity.getName());
            String camel = toLowerCamelCase(entity.getName());

            initRepos.append(String.format("\t%sRepo := repositories.New%sRepository(db)\n", camel, entity.getName()));
            initHandlers.append(String.format("\t%sHandler := handlers.New%sHandler(%sRepo)\n", camel, entity.getName(), camel));

            String baseRoute = "/api/" + toPlural(snake);
            endpoints.append(String.format("\t\tapi.GET(\"%s\", %sHandler.GetAll)\n", baseRoute, camel));
            endpoints.append(String.format("\t\tapi.GET(\"%s/:id\", %sHandler.GetByID)\n", baseRoute, camel));
            endpoints.append(String.format("\t\tapi.POST(\"%s\", %sHandler.Create)\n", baseRoute, camel));
            endpoints.append(String.format("\t\tapi.PUT(\"%s/:id\", %sHandler.Update)\n", baseRoute, camel));
            endpoints.append(String.format("\t\tapi.DELETE(\"%s/:id\", %sHandler.Delete)\n", baseRoute, camel));
        }

        return """
                package routes
                
                import (
                \t"github.com/gin-gonic/gin"
                \tgorm.io/gorm"
                \t"%s/internal/handlers"
                \t"%s/internal/repositories"
                )
                
                func SetupRoutes(router *gin.Engine, db *gorm.DB) {
                %s
                %s
                \tapi := router.Group("")
                \t{
                %s\t}
                }
                """.formatted(moduleName, moduleName, initRepos.toString(), initHandlers.toString(), endpoints.toString());
    }

    private String generateModel(EntityDto entity, DiagramDto diagram) {
        StringBuilder fields = new StringBuilder();
        StringBuilder jsonNameMap = new StringBuilder();

        boolean hasTime = false;

        for (AttributeDto attr : entity.getAttributes()) {
            String goType = getGoType(attr.getType());
            if ("time.Time".equals(goType)) hasTime = true;

            String columnName = toSnakeCase(attr.getName());

            fields.append("\t").append(capitalize(attr.getName())).append(" ").append(goType);

            // Tags
            List<String> gormTags = new ArrayList<>();
            if (attr.isPrimaryKey()) {
                gormTags.add("primaryKey");
                if ("UUID".equalsIgnoreCase(attr.getType())) {
                    gormTags.add("type:uuid");
                    gormTags.add("default:gen_random_uuid()");
                } else {
                    gormTags.add("autoIncrement");
                }
            } else {
                if ("String".equalsIgnoreCase(attr.getType())) {
                    gormTags.add("type:varchar(255)");
                } else if ("UUID".equalsIgnoreCase(attr.getType())) {
                    gormTags.add("type:uuid");
                } else if ("BigDecimal".equalsIgnoreCase(attr.getType())) {
                    gormTags.add("type:numeric(19,4)");
                }
                if (!attr.isNullable()) {
                    gormTags.add("not null");
                }
                if (attr.isUnique()) {
                    gormTags.add("unique");
                }
                if (attr.getDefaultValue() != null && !attr.getDefaultValue().trim().isEmpty()) {
                    gormTags.add("default:" + formatGoDefault(attr.getType(), attr.getDefaultValue()));
                }
            }

            fields.append("\t`gorm:\"").append(String.join(";", gormTags))
                    .append("\" json:\"").append(columnName).append("\"`\n");
        }

        // Add relationships GORM fields
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());
                if (!isFrom && !isTo) continue;

                String target = isFrom ? rel.getTo() : rel.getFrom();
                String fkCol = getForeignKeyColumn(rel);

                if ("ONE_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        fields.append("\t").append(toPlural(target)).append(" []").append(target)
                                .append(" `gorm:\"foreignKey:").append(capitalize(fkCol)).append("\" json:\"")
                                .append(toPlural(toLowerCamelCase(target))).append(",omitempty\"`\n");
                    } else {
                        // Belongs to
                        fields.append("\t").append(capitalize(fkCol)).append(" uint `json:\"").append(fkCol).append("\"`\n");
                        fields.append("\t").append(target).append(" *").append(target)
                                .append(" `gorm:\"foreignKey:").append(capitalize(fkCol)).append("\" json:\"")
                                .append(toLowerCamelCase(target)).append(",omitempty\"`\n");
                    }
                } else if ("MANY_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        fields.append("\t").append(capitalize(fkCol)).append(" uint `json:\"").append(fkCol).append("\"`\n");
                        fields.append("\t").append(target).append(" *").append(target)
                                .append(" `gorm:\"foreignKey:").append(capitalize(fkCol)).append("\" json:\"")
                                .append(toLowerCamelCase(target)).append(",omitempty\"`\n");
                    } else {
                        fields.append("\t").append(toPlural(target)).append(" []").append(target)
                                .append(" `gorm:\"foreignKey:").append(capitalize(fkCol)).append("\" json:\"")
                                .append(toPlural(toLowerCamelCase(target))).append(",omitempty\"`\n");
                    }
                } else if ("ONE_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        fields.append("\t").append(capitalize(fkCol)).append(" uint `json:\"").append(fkCol).append("\"`\n");
                        fields.append("\t").append(target).append(" *").append(target)
                                .append(" `gorm:\"foreignKey:").append(capitalize(fkCol)).append("\" json:\"")
                                .append(toLowerCamelCase(target)).append(",omitempty\"`\n");
                    } else {
                        fields.append("\t").append(target).append(" *").append(target)
                                .append(" `gorm:\"foreignKey:").append(capitalize(fkCol)).append("\" json:\"")
                                .append(toLowerCamelCase(target)).append(",omitempty\"`\n");
                    }
                } else if ("MANY_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    String pivotName = rel.getJoinTable() != null && !rel.getJoinTable().trim().isEmpty()
                            ? rel.getJoinTable().trim()
                            : toSnakeCase(rel.getFrom()) + "_" + toSnakeCase(rel.getTo());
                    fields.append("\t").append(toPlural(target)).append(" []").append(target)
                            .append(" `gorm:\"many2many:").append(pivotName).append(";\" json:\"")
                            .append(toPlural(toLowerCamelCase(target))).append(",omitempty\"`\n");
                }
            }
        }

        if (entity.isSoftDelete()) {
            fields.append("\tDeletedAt gorm.DeletedAt `gorm:\"index\" json:\"deletedAt,omitempty\"`\n");
        }

        String tableOverride = "";
        if (entity.getTableName() != null && !entity.getTableName().trim().isEmpty()) {
            tableOverride = String.format("""
                
                func (%s) TableName() string {
                \treturn "%s"
                }
                """, entity.getName(), entity.getTableName().trim());
        }

        String timeImport = hasTime ? "\t\"time\"\n" : "";

        return """
                package models
                
                import (
                %s\t"gorm.io/gorm"
                )
                
                type %s struct {
                %s}
                %s""".formatted(timeImport, entity.getName(), fields.toString(), tableOverride);
    }

    private String generateRepository(String moduleName, EntityDto entity) {
        String pkGoType = getPkGoType(entity);

        return """
                package repositories
                
                import (
                \tgorm.io/gorm"
                \t"%s/internal/models"
                )
                
                type %sRepository interface {
                \tFindAll() ([]models.%s, error)
                \tFindByID(id %s) (models.%s, error)
                \tCreate(entity *models.%s) error
                \tUpdate(entity *models.%s) error
                \tDelete(id %s) error
                }
                
                type %sRepository struct {
                \tdb *gorm.DB
                }
                
                func New%sRepository(db *gorm.DB) %sRepository {
                \treturn &%sRepository{db: db}
                }
                
                func (r *%sRepository) FindAll() ([]models.%s, error) {
                \tvar items []models.%s
                \terr := r.db.Find(&items).Error
                \treturn items, err
                }
                
                func (r *%sRepository) FindByID(id %s) (models.%s, error) {
                \tvar item models.%s
                \terr := r.db.First(&item, id).Error
                \treturn item, err
                }
                
                func (r *%sRepository) Create(entity *models.%s) error {
                \treturn r.db.Create(entity).Error
                }
                
                func (r *%sRepository) Update(entity *models.%s) error {
                \treturn r.db.Save(entity).Error
                }
                
                func (r *%sRepository) Delete(id %s) error {
                \treturn r.db.Delete(&models.%s{}, id).Error
                }
                """.formatted(
                moduleName, entity.getName(), entity.getName(), pkGoType, entity.getName(),
                entity.getName(), entity.getName(), pkGoType,
                toLowerCamelCase(entity.getName()), entity.getName(), entity.getName(),
                toLowerCamelCase(entity.getName()), toLowerCamelCase(entity.getName()),
                entity.getName(), entity.getName(), toLowerCamelCase(entity.getName()),
                pkGoType, entity.getName(), entity.getName(), toLowerCamelCase(entity.getName()),
                entity.getName(), toLowerCamelCase(entity.getName()), entity.getName(),
                toLowerCamelCase(entity.getName()), pkGoType, entity.getName()
        );
    }

    private String generateHandler(String moduleName, EntityDto entity, DiagramDto diagram) {
        String pkGoType = getPkGoType(entity);
        String parseIdBlock = "";

        if ("uint".equals(pkGoType)) {
            parseIdBlock = """
                    \tidStr := c.Param("id")
                    \tidVal, err := strconv.ParseUint(idStr, 10, 32)
                    \tif err != nil {
                    \t\tc.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
                    \t\treturn
                    \t}
                    \tid := uint(idVal)
                    """;
        } else if ("int64".equals(pkGoType)) {
            parseIdBlock = """
                    \tidStr := c.Param("id")
                    \tidVal, err := strconv.ParseInt(idStr, 10, 64)
                    \tif err != nil {
                    \t\tc.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
                    \t\treturn
                    \t}
                    \tid := idVal
                    """;
        } else {
            // String / UUID
            parseIdBlock = "\tid := c.Param(" + "\"id\")\n";
        }

        String swg = diagram.isFeatureEnabled("swagger") ? String.format("""
            // GetAll godoc
            // @Summary Get all %s records
            // @Tags %s
            // @Success 200 {array} models.%s
            // @Router /api/%s [get]
            """, toPlural(entity.getName()), toPlural(entity.getName()), entity.getName(), toPlural(toSnakeCase(entity.getName()))) : "";

        return """
                package handlers
                
                import (
                \t"net/http"
                \t"strconv"
                \t"github.com/gin-gonic/gin"
                \t"%s/internal/models"
                \t"%s/internal/repositories"
                )
                
                type %sHandler struct {
                \trepo repositories.%sRepository
                }
                
                func New%sHandler(repo repositories.%sRepository) *%sHandler {
                \treturn &%sHandler{repo: repo}
                }
                
                %sfunc (h *%sHandler) GetAll(c *gin.Context) {
                \titems, err := h.repo.FindAll()
                \tif err != nil {
                \t\tc.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
                \t\treturn
                \t}
                \tc.JSON(http.StatusOK, items)
                }
                
                func (h *%sHandler) GetByID(c *gin.Context) {
                %s\titem, err := h.repo.FindByID(id)
                \tif err != nil {
                \t\tc.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
                \t\treturn
                \t}
                \tc.JSON(http.StatusOK, item)
                }
                
                func (h *%sHandler) Create(c *gin.Context) {
                \tvar item models.%s
                \tif err := c.ShouldBindJSON(&item); err != nil {
                \t\tc.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
                \t\treturn
                \t}
                \tif err := h.repo.Create(&item); err != nil {
                \t\tc.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
                \t\treturn
                \t}
                \tc.JSON(http.StatusCreated, item)
                }
                
                func (h *%sHandler) Update(c *gin.Context) {
                %s\titem, err := h.repo.FindByID(id)
                \tif err != nil {
                \t\tc.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
                \t\treturn
                \t}
                \tif err := c.ShouldBindJSON(&item); err != nil {
                \t\tc.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
                \t\treturn
                \t}
                \tif err := h.repo.Update(&item); err != nil {
                \t\tc.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
                \t\treturn
                \t}
                \tc.JSON(http.StatusOK, item)
                }
                
                func (h *%sHandler) Delete(c *gin.Context) {
                %s\tif err := h.repo.Delete(id); err != nil {
                \t\tc.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
                \t\treturn
                \t}
                \tc.JSON(http.StatusNoContent, nil)
                }
                """.formatted(
                moduleName, moduleName, entity.getName(), entity.getName(),
                entity.getName(), entity.getName(), entity.getName(),
                toLowerCamelCase(entity.getName()), swg, entity.getName(),
                entity.getName(), parseIdBlock,
                entity.getName(), entity.getName(), parseIdBlock,
                entity.getName(), parseIdBlock
        );
    }

    private String generateRepositoryTest(String moduleName, EntityDto entity) {
        return """
                package repositories
                
                import (
                \t"testing"
                )
                
                func Test%sRepository_FindAll(t *testing.T) {
                \t// Repository table-driven test placeholder
                }
                """.formatted(entity.getName());
    }

    private String generateDockerfile() {
        return """
                FROM golang:1.20-alpine AS builder
                WORKDIR /app
                COPY go.mod go.sum ./
                RUN go mod download
                COPY . .
                RUN go build -o main cmd/server/main.go
                
                FROM alpine:latest
                WORKDIR /app
                COPY --from=builder /app/main .
                EXPOSE 8080
                CMD ["./main"]
                """;
    }

    private String generateDockerCompose(DiagramDto diagram) {
        return """
                version: '3.8'
                services:
                  app:
                    build: .
                    ports:
                      - "8080:8080"
                    environment:
                      - DATABASE_URL=postgres://postgres:postgres@db:5432/%s?sslmode=disable
                    depends_on:
                      - db
                  db:
                    image: postgres:15
                    ports:
                      - "5432:5432"
                    environment:
                      - POSTGRES_DB=%s
                      - POSTGRES_USER=postgres
                      - POSTGRES_PASSWORD=postgres
                """.formatted(toSnakeCase(diagram.getProjectName()), toSnakeCase(diagram.getProjectName()));
    }

    private String getGoType(String type) {
        if (type == null) return "string";
        switch (type.toLowerCase()) {
            case "integer":
            case "int":
                return "int";
            case "long":
                return "int64";
            case "boolean":
                return "bool";
            case "localdate":
            case "localdatetime":
            case "date":
                return "time.Time";
            case "bigdecimal":
                return "float64";
            case "string":
            case "uuid":
            case "enum":
            default:
                return "string";
        }
    }

    private String getPkGoType(EntityDto entity) {
        for (AttributeDto attr : entity.getAttributes()) {
            if (attr.isPrimaryKey()) {
                String type = attr.getType().toLowerCase();
                if ("integer".equals(type) || "int".equals(type)) return "int";
                if ("long".equals(type)) return "int64";
                return "string";
            }
        }
        return "uint";
    }

    private String formatGoDefault(String type, String value) {
        if (value == null) return "nil";
        String t = type.toLowerCase();
        if ("boolean".equals(t)) {
            return "true".equalsIgnoreCase(value) || "1".equals(value) ? "true" : "false";
        }
        if ("integer".equals(t) || "long".equals(t) || "bigdecimal".equals(t)) {
            return value;
        }
        return "'" + value.replace("'", "\\'") + "'";
    }

    private String getForeignKeyColumn(RelationshipDto rel) {
        String field = rel.getFromField();
        if (field == null || field.trim().isEmpty()) {
            return toSnakeCase(rel.getFrom()) + "Id";
        }
        String camel = toLowerCamelCase(field);
        if (camel.endsWith("Id")) return camel;
        return camel + "Id";
    }

    // ---- Case conversions & utilities ----

    private String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase();
    }

    private String toLowerCamelCase(String str) {
        if (str == null || str.isEmpty()) return "";
        return str.substring(0, 1).toLowerCase() + str.substring(1);
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
