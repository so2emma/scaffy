package com.example.scaffy.service.impl;

import com.example.scaffy.model.*;
import com.example.scaffy.service.CodeGenerator;
import com.example.scaffy.service.DockerFileGenerator;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.util.stream.Collectors;

@Component
public class LaravelCodeGenerator implements CodeGenerator {

    @Override
    public boolean supports(String framework) {
        return "LARAVEL".equalsIgnoreCase(framework);
    }

    @Override
    public String getFrameworkId() {
        return "LARAVEL";
    }

    @Override
    public String getDisplayName() {
        return "Laravel";
    }

    @Override
    public String getLanguage() {
        return "PHP";
    }

    @Override
    public String getDescription() {
        return "Eloquent · REST API · Sanctum";
    }

    @Override
    public String getColor() {
        return "#f43f5e";
    }

    @Override
    public List<FeatureDescriptor> getAvailableFeatures() {
        return List.of(
                new FeatureDescriptor("sanctumAuth", "Laravel Sanctum (API Auth)", "Dedicated API token authentication via Sanctum", false),
                new FeatureDescriptor("formRequests", "Form Request Validation", "Dedicated FormRequest validation classes", true),
                new FeatureDescriptor("apiResources", "API Resource Transformers", "Transform API responses with API Resources", true),
                new FeatureDescriptor("phpunit", "PHPUnit Feature Tests", "Generate feature tests for CRUD operations", false),
                new FeatureDescriptor("dockerFile", "Dockerfile + Compose", "Containerize the Laravel application", false)
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
    public Map<String, String> generateFullPreview(DiagramDto diagram) throws Exception {
        Map<String, String> rawFiles = generateAllFiles(diagram);
        String projectFolder = toSnakeCase(diagram.getProjectName()) + "/";
        Map<String, String> result = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : rawFiles.entrySet()) {
            result.put(projectFolder + entry.getKey(), entry.getValue());
        }
        return result;
    }

    @Override
    public Map<String, String> generatePreview(DiagramDto diagram, String entityName) throws Exception {
        if ("__PROJECT__".equalsIgnoreCase(entityName)) {
            Map<String, String> preview = new LinkedHashMap<>();
            Map<String, String> allFiles = generateAllFiles(diagram);

            preview.put("composer.json", allFiles.getOrDefault("composer.json", ""));
            preview.put("routes/api.php", allFiles.getOrDefault("routes/api.php", ""));
            preview.put(".env.example", allFiles.getOrDefault(".env.example", ""));

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
        EntityDto target = diagram.getEntities().stream()
                .filter(e -> e.getName().equalsIgnoreCase(entityName))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Entity not found: " + entityName));

        Map<String, String> allFiles = generateAllFiles(diagram);

        String entitySnake = toSnakeCase(target.getName());
        String entityPlural = toPlural(entitySnake);

        // Find Model
        String modelKey = "app/Models/" + target.getName() + ".php";
        preview.put("Model", allFiles.getOrDefault(modelKey, ""));

        // Find Controller
        String controllerKey = "app/Http/Controllers/Api/" + target.getName() + "Controller.php";
        preview.put("Controller", allFiles.getOrDefault(controllerKey, ""));

        // Find Store/Update requests
        if (diagram.isFeatureEnabled("formRequests")) {
            String storeRequestKey = "app/Http/Requests/Store" + target.getName() + "Request.php";
            String updateRequestKey = "app/Http/Requests/Update" + target.getName() + "Request.php";
            preview.put("Store Request", allFiles.getOrDefault(storeRequestKey, ""));
            preview.put("Update Request", allFiles.getOrDefault(updateRequestKey, ""));
        }

        // Find API Resource
        if (diagram.isFeatureEnabled("apiResources")) {
            String resourceKey = "app/Http/Resources/" + target.getName() + "Resource.php";
            preview.put("API Resource", allFiles.getOrDefault(resourceKey, ""));
        }

        // Find Migration
        String migrationPattern = "create_" + entityPlural + "_table";
        String migrationContent = allFiles.entrySet().stream()
                .filter(entry -> entry.getKey().contains(migrationPattern))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse("");
        preview.put("Migration", migrationContent);

        // Find Routes
        preview.put("Routes", allFiles.getOrDefault("routes/api.php", ""));

        // Find Feature Test
        if (diagram.isFeatureEnabled("phpunit")) {
            String testKey = "tests/Feature/" + target.getName() + "Test.php";
            preview.put("Feature Test", allFiles.getOrDefault(testKey, ""));
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

    private Map<String, String> generateAllFiles(DiagramDto diagram) {
        Map<String, String> files = new HashMap<>();

        // Core config
        files.put("composer.json", generateComposerJson(diagram));
        files.put(".env.example", generateEnvExample(diagram));
        files.put("README.md", generateReadme(diagram));
        files.put("routes/api.php", generateRoutes(diagram));

        if (diagram.isFeatureEnabled("dockerFile")) {
            String framework = getFrameworkId();
            String projName = diagram.getProjectName();
            files.put("Dockerfile", DockerFileGenerator.generateDockerfile(framework, projName));
            files.put("docker-compose.yml", DockerFileGenerator.generateDockerCompose(framework, projName));
            files.put(".github/workflows/ci.yml", DockerFileGenerator.generateGithubActionsWorkflow(framework, projName));
            files.put(".env.example", DockerFileGenerator.generateDotEnvExample(framework, projName));
        }

        int migrationIndex = 1;

        // Models, Requests, Resources, Controllers, Migrations, Tests
        for (EntityDto entity : diagram.getEntities()) {
            files.put("app/Models/" + entity.getName() + ".php", generateModel(entity, diagram));

            if (diagram.isFeatureEnabled("formRequests")) {
                files.put("app/Http/Requests/Store" + entity.getName() + "Request.php", generateFormRequest(entity, "Store"));
                files.put("app/Http/Requests/Update" + entity.getName() + "Request.php", generateFormRequest(entity, "Update"));
            }

            if (diagram.isFeatureEnabled("apiResources")) {
                files.put("app/Http/Resources/" + entity.getName() + "Resource.php", generateResource(entity));
            }

            files.put("app/Http/Controllers/Api/" + entity.getName() + "Controller.php", generateController(entity, diagram));

            String migrationPath = String.format("database/migrations/2024_01_01_%06d_create_%s_table.php",
                    migrationIndex++, toSnakeCase(toPlural(entity.getName())));
            files.put(migrationPath, generateMigration(entity, diagram));

            if (diagram.isFeatureEnabled("phpunit")) {
                files.put("tests/Feature/" + entity.getName() + "Test.php", generateTest(entity, diagram));
            }

            // Enum files
            for (AttributeDto attr : entity.getAttributes()) {
                if ("Enum".equalsIgnoreCase(attr.getType()) && attr.getEnumValues() != null) {
                    files.put("app/Enums/" + capitalize(attr.getName()) + "Enum.php", generateEnum(attr));
                }
            }
        }

        // Pivot tables for MANY_TO_MANY
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                if ("MANY_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    String pivotName = rel.getJoinTable() != null && !rel.getJoinTable().trim().isEmpty()
                            ? rel.getJoinTable().trim()
                            : toSnakeCase(rel.getFrom()) + "_" + toSnakeCase(rel.getTo());
                    String migrationPath = String.format("database/migrations/2024_01_01_%06d_create_%s_table.php",
                            migrationIndex++, pivotName);
                    files.put(migrationPath, generatePivotMigration(rel));
                }
            }
        }

        return files;
    }

    private String generateComposerJson(DiagramDto diagram) {
        boolean sanctum = diagram.isFeatureEnabled("sanctumAuth");
        boolean phpunit = diagram.isFeatureEnabled("phpunit");
        return """
                {
                    "name": "laravel/laravel",
                    "type": "project",
                    "description": "The skeleton application for the Laravel framework.",
                    "keywords": ["laravel", "framework"],
                    "license": "MIT",
                    "require": {
                        "php": "^8.2",
                        "laravel/framework": "^11.0"%s
                    },
                    "require-dev": {
                        "fakerphp/faker": "^1.23",
                        "mockery/mockery": "^1.6",
                        "nunomaduro/collision": "^8.1"%s
                    },
                    "autoload": {
                        "psr-4": {
                            "App\\\\": "app/"
                        }
                    },
                    "config": {
                        "optimize-autoloader": true,
                        "preferred-install": "dist",
                        "sort-packages": true
                    }
                }
                """.formatted(
                sanctum ? ",\n        \"laravel/sanctum\": \"^4.0\"" : "",
                phpunit ? ",\n        \"phpunit/phpunit\": \"^10.5\"" : ""
        );
    }

    private String generateEnvExample(DiagramDto diagram) {
        return """
                APP_NAME="%s"
                APP_ENV=local
                APP_KEY=base64:yk4yP6x7Vq93dFfX1WJ3rB2nLmPs5tQxZwVbMnKp9o=
                APP_DEBUG=true
                APP_URL=http://localhost
                
                DB_CONNECTION=pgsql
                DB_HOST=127.0.0.1
                DB_PORT=5432
                DB_DATABASE=%s
                DB_USERNAME=postgres
                DB_PASSWORD=postgres
                """.formatted(diagram.getProjectName(), toSnakeCase(diagram.getProjectName()));
    }

    private String generateReadme(DiagramDto diagram) {
        return """
                # %s (Laravel REST API)
                
                This project was scaffolded using Scaffy.
                
                ## Requirements
                - PHP >= 8.2
                - Composer
                
                ## Getting Started
                1. Clone this repository
                2. Install dependencies: `composer install`
                3. Copy .env: `cp .env.example .env`
                4. Generate app key: `php artisan key:generate`
                5. Configure database in `.env`
                6. Run migrations: `php artisan migrate`
                7. Start server: `php artisan serve`
                
                ## Enabled Features
                %s
                """.formatted(
                diagram.getProjectName(),
                diagram.getEnabledFeatures() != null ?
                diagram.getEnabledFeatures().entrySet().stream()
                        .filter(Map.Entry::getValue)
                        .map(e -> "- " + e.getKey())
                        .collect(Collectors.joining("\n")) : "None"
        );
    }

    private String generateRoutes(DiagramDto diagram) {
        StringBuilder imports = new StringBuilder();
        StringBuilder routeCalls = new StringBuilder();

        for (EntityDto entity : diagram.getEntities()) {
            imports.append("use App\\Http\\Controllers\\Api\\").append(entity.getName()).append("Controller;\n");
            routeCalls.append("Route::apiResource('")
                    .append(toPlural(toSnakeCase(entity.getName())))
                    .append("', ")
                    .append(entity.getName())
                    .append("Controller::class);\n");
        }

        if (diagram.isFeatureEnabled("sanctumAuth")) {
            return """
                    <?php
                    
                    use Illuminate\\Support\\Facades\\Route;
                    %s
                    Route::middleware('auth:sanctum')->group(function () {
                        %s
                    });
                    """.formatted(imports.toString(), routeCalls.toString().replace("\n", "\n    ").trim());
        } else {
            return """
                    <?php
                    
                    use Illuminate\\Support\\Facades\\Route;
                    %s
                    %s
                    """.formatted(imports.toString(), routeCalls.toString());
        }
    }

    private String generateModel(EntityDto entity, DiagramDto diagram) {
        StringBuilder traits = new StringBuilder();
        StringBuilder relations = new StringBuilder();
        StringBuilder casts = new StringBuilder();

        traits.append("use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;\n");
        String traitsBlock = "    use HasFactory;";

        if (entity.isSoftDelete()) {
            traits.append("use Illuminate\\Database\\Eloquent\\SoftDeletes;\n");
            traitsBlock += "\n    use SoftDeletes;";
        }

        String tableName = (entity.getTableName() != null && !entity.getTableName().trim().isEmpty())
                ? entity.getTableName().trim() : toSnakeCase(toPlural(entity.getName()));

        String fillable = entity.getAttributes().stream()
                .filter(a -> !a.isPrimaryKey())
                .map(a -> "'" + a.getName() + "'")
                .collect(Collectors.joining(", "));

        // Casts for Enums
        for (AttributeDto attr : entity.getAttributes()) {
            if ("Enum".equalsIgnoreCase(attr.getType())) {
                casts.append("        '").append(attr.getName()).append("' => \\App\\Enums\\").append(capitalize(attr.getName())).append("Enum::class,\n");
            }
        }

        // Relations
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());
                if (!isFrom && !isTo) continue;

                String targetEntity = isFrom ? rel.getTo() : rel.getFrom();
                String foreignKey = getForeignKeyColumn(rel);

                if ("ONE_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relations.append(String.format("""
                            
                                public function %s()
                                {
                                    return $this->hasMany(\\App\\Models\\%s::class, '%s');
                                }
                            """, toPlural(toLowerCamelCase(targetEntity)), targetEntity, foreignKey));
                    } else {
                        relations.append(String.format("""
                            
                                public function %s()
                                {
                                    return $this->belongsTo(\\App\\Models\\%s::class, '%s');
                                }
                            """, toLowerCamelCase(targetEntity), targetEntity, foreignKey));
                    }
                } else if ("MANY_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relations.append(String.format("""
                            
                                public function %s()
                                {
                                    return $this->belongsTo(\\App\\Models\\%s::class, '%s');
                                }
                            """, toLowerCamelCase(targetEntity), targetEntity, foreignKey));
                    } else {
                        relations.append(String.format("""
                            
                                public function %s()
                                {
                                    return $this->hasMany(\\App\\Models\\%s::class, '%s');
                                }
                            """, toPlural(toLowerCamelCase(targetEntity)), targetEntity, foreignKey));
                    }
                } else if ("ONE_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        relations.append(String.format("""
                            
                                public function %s()
                                {
                                    return $this->belongsTo(\\App\\Models\\%s::class, '%s');
                                }
                            """, toLowerCamelCase(targetEntity), targetEntity, foreignKey));
                    } else {
                        relations.append(String.format("""
                            
                                public function %s()
                                {
                                    return $this->hasOne(\\App\\Models\\%s::class, '%s');
                                }
                            """, toLowerCamelCase(targetEntity), targetEntity, foreignKey));
                    }
                } else if ("MANY_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    String pivotName = rel.getJoinTable() != null && !rel.getJoinTable().trim().isEmpty()
                            ? rel.getJoinTable().trim()
                            : toSnakeCase(rel.getFrom()) + "_" + toSnakeCase(rel.getTo());
                    String fromCol = toSnakeCase(rel.getFrom()) + "_id";
                    String toCol = toSnakeCase(rel.getTo()) + "_id";

                    relations.append(String.format("""
                        
                            public function %s()
                            {
                                return $this->belongsToMany(\\App\\Models\\%s::class, '%s', '%s', '%s');
                            }
                        """, toPlural(toLowerCamelCase(targetEntity)), targetEntity, pivotName,
                            isFrom ? fromCol : toCol, isFrom ? toCol : fromCol));
                }
            }
        }

        String castsBlock = casts.length() > 0 ? """
                
                    protected $casts = [
                %s    ];
                """.formatted(casts.toString()) : "";

        return """
                <?php
                
                namespace App\\Models;
                
                use Illuminate\\Database\\Eloquent\\Model;
                %s
                class %s extends Model
                {
                %s
                
                    protected $table = '%s';
                
                    protected $fillable = [%s];
                %s%s}
                """.formatted(traits.toString(), entity.getName(), traitsBlock, tableName, fillable, castsBlock, relations.toString());
    }

    private String generateFormRequest(EntityDto entity, String actionType) {
        StringBuilder rules = new StringBuilder();

        for (AttributeDto attr : entity.getAttributes()) {
            if (attr.isPrimaryKey()) continue;
            List<String> listRules = new ArrayList<>();

            if (attr.getValidation() != null && attr.getValidation().isRequired()) {
                listRules.add("'required'");
            } else if (!attr.isNullable()) {
                listRules.add("'required'");
            } else {
                listRules.add("'nullable'");
            }

            String type = attr.getType().toLowerCase();
            if ("string".equals(type)) {
                listRules.add("'string'");
                if (attr.getValidation() != null) {
                    if (attr.getValidation().getMinSize() != null) {
                        listRules.add("'min:" + attr.getValidation().getMinSize() + "'");
                    }
                    if (attr.getValidation().getMaxSize() != null) {
                        listRules.add("'max:" + attr.getValidation().getMaxSize() + "'");
                    }
                    if (attr.getValidation().isEmail()) {
                        listRules.add("'email'");
                    }
                }
            } else if ("integer".equals(type) || "long".equals(type)) {
                listRules.add("'integer'");
            } else if ("boolean".equals(type)) {
                listRules.add("'boolean'");
            } else if ("uuid".equals(type)) {
                listRules.add("'uuid'");
            } else if ("localdate".equals(type)) {
                listRules.add("'date'");
            } else if ("localdatetime".equals(type)) {
                listRules.add("'date'");
            } else if ("bigdecimal".equals(type)) {
                listRules.add("'numeric'");
            } else if ("enum".equals(type)) {
                if (attr.getEnumValues() != null && !attr.getEnumValues().isEmpty()) {
                    String vals = attr.getEnumValues().stream().map(v -> "'" + v + "'").collect(Collectors.joining(", "));
                    listRules.add("Illuminate\\Validation\\Rule::in([" + vals + "])");
                } else {
                    listRules.add("'string'");
                }
            }

            rules.append("            '").append(attr.getName()).append("' => [")
                    .append(String.join(", ", listRules)).append("],\n");
        }

        return """
                <?php
                
                namespace App\\Http\\Requests;
                
                use Illuminate\\Foundation\\Http\\FormRequest;
                
                class %s%sRequest extends FormRequest
                {
                    public function authorize(): bool
                    {
                        return true;
                    }
                
                    public function rules(): array
                    {
                        return [
                %s        ];
                    }
                }
                """.formatted(actionType, entity.getName(), rules.toString());
    }

    private String generateResource(EntityDto entity) {
        StringBuilder items = new StringBuilder();
        for (AttributeDto attr : entity.getAttributes()) {
            items.append("            '").append(attr.getName()).append("' => $this->").append(attr.getName()).append(",\n");
        }
        return """
                <?php
                
                namespace App\\Http\\Resources;
                
                use Illuminate\\Http\\Request;
                use Illuminate\\Http\\Resources\\Json\\JsonResource;
                
                class %sResource extends JsonResource
                {
                    public function toArray(Request $request): array
                    {
                        return [
                %s        ];
                    }
                }
                """.formatted(entity.getName(), items.toString());
    }

    private String generateController(EntityDto entity, DiagramDto diagram) {
        boolean sanctum = diagram.isFeatureEnabled("sanctumAuth");
        boolean formReq = diagram.isFeatureEnabled("formRequests");
        boolean apiRes = diagram.isFeatureEnabled("apiResources");

        String storeReqClass = formReq ? "Store" + entity.getName() + "Request" : "Request";
        String updateReqClass = formReq ? "Update" + entity.getName() + "Request" : "Request";

        String reqImport = formReq ? """
                use App\\Http\\Requests\\Store%sRequest;
                use App\\Http\\Requests\\Update%sRequest;
                """.formatted(entity.getName(), entity.getName()) : "use Illuminate\\Http\\Request;\n";

        String resourceImport = apiRes ? "use App\\Http\\Resources\\" + entity.getName() + "Resource;\n" : "";

        String indexReturn = apiRes ? "return " + entity.getName() + "Resource::collection($entities);" : "return response()->json($entities);";
        String showReturn = apiRes ? "return new " + entity.getName() + "Resource($entity);" : "return response()->json($entity);";
        String storeReturn = apiRes ? "return new " + entity.getName() + "Resource($entity);" : "return response()->json($entity, Response::HTTP_CREATED);";
        String updateReturn = apiRes ? "return new " + entity.getName() + "Resource($entity);" : "return response()->json($entity);";

        String storeData = formReq ? "$request->validated()" : "$request->all()";
        String updateData = formReq ? "$request->validated()" : "$request->all()";

        return """
                <?php
                
                namespace App\\Http\\Controllers\\Api;
                
                use App\\Http\\Controllers\\Controller;
                use App\\Models\\%s;
                %s%suse Illuminate\\Http\\Response;
                
                class %sController extends Controller
                {
                    public function index()
                    {
                        try {
                            $entities = %s::all();
                            %s
                        } catch (\\Exception $e) {
                            return response()->json(['error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
                        }
                    }
                
                    public function store(%s $request)
                    {
                        try {
                            $entity = %s::create(%s);
                            %s
                        } catch (\\Exception $e) {
                            return response()->json(['error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
                        }
                    }
                
                    public function show($id)
                    {
                        try {
                            $entity = %s::findOrFail($id);
                            %s
                        } catch (\\Exception $e) {
                            return response()->json(['error' => 'Resource not found'], Response::HTTP_NOT_FOUND);
                        }
                    }
                
                    public function update(%s $request, $id)
                    {
                        try {
                            $entity = %s::findOrFail($id);
                            $entity->update(%s);
                            %s
                        } catch (\\Exception $e) {
                            return response()->json(['error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
                        }
                    }
                
                    public function destroy($id)
                    {
                        try {
                            $entity = %s::findOrFail($id);
                            $entity->delete();
                            return response()->json(null, Response::HTTP_NO_CONTENT);
                        } catch (\\Exception $e) {
                            return response()->json(['error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
                        }
                    }
                }
                """.formatted(
                entity.getName(), reqImport, resourceImport, entity.getName(),
                entity.getName(), indexReturn,
                storeReqClass, entity.getName(), storeData, storeReturn,
                entity.getName(), showReturn,
                updateReqClass, entity.getName(), updateData, updateReturn,
                entity.getName()
        );
    }

    private String generateMigration(EntityDto entity, DiagramDto diagram) {
        StringBuilder fields = new StringBuilder();

        for (AttributeDto attr : entity.getAttributes()) {
            if (attr.isPrimaryKey()) {
                if ("UUID".equalsIgnoreCase(attr.getType())) {
                    fields.append("            $table->uuid('").append(attr.getName()).append("')->primary();\n");
                } else {
                    fields.append("            $table->id('").append(attr.getName()).append("');\n");
                }
                continue;
            }

            fields.append("            $table->").append(getMigrationType(attr));

            if (attr.isNullable()) {
                fields.append("->nullable()");
            }
            if (attr.isUnique()) {
                fields.append("->unique()");
            }
            if (attr.getDefaultValue() != null && !attr.getDefaultValue().trim().isEmpty()) {
                fields.append("->default(").append(formatMigrationDefault(attr)).append(")");
            }
            fields.append(";\n");
        }

        // Add foreign keys
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());
                if (!isFrom && !isTo) continue;

                // FK holds in the 'to' side for 1:N relations or the 'from' side for 1:1, or the 'from' side for N:1.
                boolean isOwner = ("ONE_TO_MANY".equalsIgnoreCase(rel.getType()) && isTo)
                        || ("MANY_TO_ONE".equalsIgnoreCase(rel.getType()) && isFrom)
                        || ("ONE_TO_ONE".equalsIgnoreCase(rel.getType()) && isFrom);

                if (isOwner) {
                    String target = isFrom ? rel.getTo() : rel.getFrom();
                    String fk = getForeignKeyColumn(rel);
                    String targetTable = toSnakeCase(toPlural(target));

                    // Check target PK type
                    String pkType = "Long";
                    for (EntityDto e : diagram.getEntities()) {
                        if (e.getName().equalsIgnoreCase(target)) {
                            pkType = e.getAttributes().stream()
                                    .filter(AttributeDto::isPrimaryKey)
                                    .map(AttributeDto::getType)
                                    .findFirst()
                                    .orElse("Long");
                            break;
                        }
                    }

                    if ("UUID".equalsIgnoreCase(pkType)) {
                        fields.append("            $table->foreignUuid('").append(fk)
                                .append("')->constrained('").append(targetTable).append("')->cascadeOnDelete();\n");
                    } else {
                        fields.append("            $table->foreignId('").append(fk)
                                .append("')->constrained('").append(targetTable).append("')->cascadeOnDelete();\n");
                    }
                }
            }
        }

        if (entity.isSoftDelete()) {
            fields.append("            $table->softDeletes();\n");
        }

        String tableName = (entity.getTableName() != null && !entity.getTableName().trim().isEmpty())
                ? entity.getTableName().trim() : toSnakeCase(toPlural(entity.getName()));

        return """
                <?php
                
                use Illuminate\\Database\\Migrations\\Migration;
                use Illuminate\\Database\\Schema\\Blueprint;
                use Illuminate\\Support\\Facades\\Schema;
                
                return new class extends Migration
                {
                    public function up(): void
                    {
                        Schema::create('%s', function (Blueprint $table) {
                %s            $table->timestamps();
                        });
                    }
                
                    public function down(): void
                    {
                        Schema::dropIfExists('%s');
                    }
                };
                """.formatted(tableName, fields.toString(), tableName);
    }

    private String generatePivotMigration(RelationshipDto rel) {
        String pivotName = rel.getJoinTable() != null && !rel.getJoinTable().trim().isEmpty()
                ? rel.getJoinTable().trim()
                : toSnakeCase(rel.getFrom()) + "_" + toSnakeCase(rel.getTo());

        String fromTable = toSnakeCase(toPlural(rel.getFrom()));
        String toTable = toSnakeCase(toPlural(rel.getTo()));
        String fromCol = toSnakeCase(rel.getFrom()) + "_id";
        String toCol = toSnakeCase(rel.getTo()) + "_id";

        return """
                <?php
                
                use Illuminate\\Database\\Migrations\\Migration;
                use Illuminate\\Database\\Schema\\Blueprint;
                use Illuminate\\Support\\Facades\\Schema;
                
                return new class extends Migration
                {
                    public function up(): void
                    {
                        Schema::create('%s', function (Blueprint $table) {
                            $table->foreignId('%s')->constrained('%s')->cascadeOnDelete();
                            $table->foreignId('%s')->constrained('%s')->cascadeOnDelete();
                            $table->primary(['%s', '%s']);
                        });
                    }
                
                    public function down(): void
                    {
                        Schema::dropIfExists('%s');
                    }
                };
                """.formatted(pivotName, fromCol, fromTable, toCol, toTable, fromCol, toCol, pivotName);
    }

    private String generateEnum(AttributeDto attr) {
        StringBuilder cases = new StringBuilder();
        for (String val : attr.getEnumValues()) {
            cases.append("    case ").append(val.toUpperCase()).append(" = '").append(val).append("';\n");
        }
        return """
                <?php
                
                namespace App\\Enums;
                
                enum %sEnum: string
                {
                %s}
                """.formatted(capitalize(attr.getName()), cases.toString());
    }

    private String generateTest(EntityDto entity, DiagramDto diagram) {
        return """
                <?php
                
                namespace Tests\\Feature;
                
                use App\\Models\\%s;
                use Illuminate\\Foundation\\Testing\\RefreshDatabase;
                use Tests\\TestCase;
                
                class %sTest extends TestCase
                {
                    use RefreshDatabase;
                
                    public function test_can_get_all_entities()
                    {
                        %s::factory()->count(3)->create();
                
                        $response = $this->getJson('/api/%s');
                
                        $response->assertStatus(200);
                    }
                }
                """.formatted(entity.getName(), entity.getName(), entity.getName(), toPlural(toSnakeCase(entity.getName())));
    }

    private String generateDockerfile() {
        return """
                FROM php:8.2-fpm
                
                RUN apt-get update && apt-get install -y \\
                    git \\
                    curl \\
                    libpng-dev \\
                    libonig-dev \\
                    libxml2-dev \\
                    zip \\
                    unzip
                
                RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd
                
                COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
                
                WORKDIR /var/www
                
                COPY . .
                
                RUN composer install --no-interaction --optimize-autoloader --no-dev
                
                EXPOSE 9000
                CMD ["php-fpm"]
                """;
    }

    private String generateDockerCompose(DiagramDto diagram) {
        return """
                version: '3.8'
                services:
                  app:
                    build: .
                    ports:
                      - "8000:8000"
                    volumes:
                      - .:/var/www
                    environment:
                      - DB_HOST=db
                  db:
                    image: postgres:15
                    ports:
                      - "5432:5432"
                    environment:
                      - POSTGRES_DB=%s
                      - POSTGRES_USER=postgres
                      - POSTGRES_PASSWORD=postgres
                """.formatted(toSnakeCase(diagram.getProjectName()));
    }

    private String getMigrationType(AttributeDto attr) {
        String type = attr.getType().toLowerCase();
        String colName = toSnakeCase(attr.getName());

        switch (type) {
            case "string":
                return "string('" + colName + "', 255)";
            case "integer":
            case "int":
                return "integer('" + colName + "')";
            case "long":
                return "bigInteger('" + colName + "')";
            case "uuid":
                return "uuid('" + colName + "')";
            case "boolean":
                return "boolean('" + colName + "')";
            case "localdate":
            case "date":
                return "date('" + colName + "')";
            case "localdatetime":
                return "dateTime('" + colName + "')";
            case "bigdecimal":
                return "decimal('" + colName + "', 8, 2)";
            case "enum":
                if (attr.getEnumValues() != null && !attr.getEnumValues().isEmpty()) {
                    String vals = attr.getEnumValues().stream().map(v -> "'" + v + "'").collect(Collectors.joining(", "));
                    return "enum('" + colName + "', [" + vals + "])";
                }
                return "string('" + colName + "')";
            default:
                return "string('" + colName + "')";
        }
    }

    private String formatMigrationDefault(AttributeDto attr) {
        String val = attr.getDefaultValue();
        if (val == null) return "null";
        String type = attr.getType().toLowerCase();

        switch (type) {
            case "boolean":
                return "true".equalsIgnoreCase(val) || "1".equals(val) ? "true" : "false";
            case "integer":
            case "long":
            case "bigdecimal":
                return val;
            default:
                return "'" + val.replace("'", "\\'") + "'";
        }
    }

    private String getForeignKeyColumn(RelationshipDto rel) {
        String field = rel.getFromField();
        if (field == null || field.trim().isEmpty()) {
            return toSnakeCase(rel.getFrom()) + "_id";
        }
        String snake = toSnakeCase(field);
        if (snake.endsWith("_id")) return snake;
        return snake + "_id";
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
