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
public class RubyOnRailsCodeGenerator implements CodeGenerator {

    @Override
    public boolean supports(String framework) {
        return "RAILS".equalsIgnoreCase(framework);
    }

    @Override
    public String getFrameworkId() {
        return "RAILS";
    }

    @Override
    public String getDisplayName() {
        return "Ruby on Rails";
    }

    @Override
    public String getLanguage() {
        return "Ruby";
    }

    @Override
    public String getDescription() {
        return "ActiveRecord · ActionController · PostgreSQL";
    }

    @Override
    public String getColor() {
        return "#f87171";
    }

    @Override
    public List<FeatureDescriptor> getAvailableFeatures() {
        return List.of(
                new FeatureDescriptor("rspecTests", "RSpec Tests", "Generates RSpec model unit test stubs", false),
                new FeatureDescriptor("serializers", "Active Model Serializers", "Enable JSON serialization formatting", true),
                new FeatureDescriptor("dockerFile", "Dockerfile + Compose", "Containerize the Rails app", false),
                new FeatureDescriptor("jbuilder", "JBuilder JSON Views", "Enable JBuilder template views", false)
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
        String entityPlural = toPlural(entitySnake);

        preview.put("Model", allFiles.getOrDefault("app/models/" + entitySnake + ".rb", ""));
        preview.put("Controller", allFiles.getOrDefault("app/controllers/api/v1/" + entityPlural + "_controller.rb", ""));

        if (diagram.isFeatureEnabled("serializers")) {
            preview.put("Serializer", allFiles.getOrDefault("app/serializers/" + entitySnake + "_serializer.rb", ""));
        }

        String migrationPattern = "create_" + entityPlural;
        String migrationContent = allFiles.entrySet().stream()
                .filter(entry -> entry.getKey().contains(migrationPattern))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse("");
        preview.put("Migration", migrationContent);

        preview.put("Routes", allFiles.getOrDefault("config/routes.rb", ""));

        if (diagram.isFeatureEnabled("rspecTests")) {
            preview.put("RSpec", allFiles.getOrDefault("spec/models/" + entitySnake + "_spec.rb", ""));
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

        files.put("Gemfile", generateGemfile(diagram));
        files.put(".env.example", generateEnvExample(diagram));
        files.put("README.md", generateReadme(diagram));
        files.put("config/routes.rb", generateRoutes(diagram));
        files.put("config/database.yml", generateDatabaseYml(diagram));
        files.put("app/models/application_record.rb", generateApplicationRecord());
        files.put("app/controllers/application_controller.rb", generateApplicationController());

        if (diagram.isFeatureEnabled("dockerFile")) {
            String framework = getFrameworkId();
            String projName = diagram.getProjectName();
            files.put("Dockerfile", DockerFileGenerator.generateDockerfile(framework, projName));
            files.put("docker-compose.yml", DockerFileGenerator.generateDockerCompose(framework, projName));
            files.put(".github/workflows/ci.yml", DockerFileGenerator.generateGithubActionsWorkflow(framework, projName));
            files.put(".env.example", DockerFileGenerator.generateDotEnvExample(framework, projName));
        }

        if (diagram.isFeatureEnabled("rspecTests")) {
            files.put("spec/rails_helper.rb", generateRailsHelper());
        }

        int migrationIndex = 1;

        for (EntityDto entity : diagram.getEntities()) {
            String entitySnake = toSnakeCase(entity.getName());
            String entityPlural = toPlural(entitySnake);

            files.put("app/models/" + entitySnake + ".rb", generateModel(entity, diagram));
            files.put("app/controllers/api/v1/" + entityPlural + "_controller.rb", generateController(entity, diagram));

            if (diagram.isFeatureEnabled("serializers")) {
                files.put("app/serializers/" + entitySnake + "_serializer.rb", generateSerializer(entity));
            }

            String migrationPath = String.format("db/migrate/20240101%06d_create_%s.rb",
                    migrationIndex++, entityPlural);
            files.put(migrationPath, generateMigration(entity, diagram));

            if (diagram.isFeatureEnabled("rspecTests")) {
                files.put("spec/models/" + entitySnake + "_spec.rb", generateSpec(entity));
            }
        }

        // Generate join tables for MANY_TO_MANY
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                if ("MANY_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    String fromPlural = toPlural(toSnakeCase(rel.getFrom()));
                    String toPlural = toPlural(toSnakeCase(rel.getTo()));
                    String migrationPath = String.format("db/migrate/20240101%06d_create_join_table_%s_%s.rb",
                            migrationIndex++, fromPlural, toPlural);
                    files.put(migrationPath, generateJoinTableMigration(rel));
                }
            }
        }

        return files;
    }

    private String generateGemfile(DiagramDto diagram) {
        boolean paranoia = diagram.getEntities().stream().anyMatch(EntityDto::isSoftDelete);
        boolean rspec = diagram.isFeatureEnabled("rspecTests");
        boolean serializer = diagram.isFeatureEnabled("serializers");

        return """
                source 'https://rubygems.org'
                git_source(:github) { |repo| "https://github.com/Ruby/#{repo}.git" }
                
                ruby '>= 3.0.0'
                
                gem 'rails', '~> 7.1.0'
                gem 'pg', '~> 1.5'
                gem 'puma', '~> 6.0'
                gem 'bootsnap', require: false
                
                %s
                %s
                group :development, :test do
                  gem 'debug', platforms: [ :mri, :mingw, :x64_mingw ]
                %s}
                
                group :development do
                  gem 'web-console'
                end
                
                gem 'dotenv-rails'
                """.formatted(
                paranoia ? "gem 'paranoia', '~> 2.6'" : "",
                serializer ? "gem 'active_model_serializers', '~> 0.10.0'" : "",
                rspec ? "  gem 'rspec-rails', '~> 6.0.0'\n" : ""
        );
    }

    private String generateEnvExample(DiagramDto diagram) {
        return """
                DATABASE_URL=postgres://postgres:postgres@localhost:5432/%s
                """.formatted(toSnakeCase(diagram.getProjectName()));
    }

    private String generateReadme(DiagramDto diagram) {
        return """
                # %s (Ruby on Rails API)
                
                This project was scaffolded using Scaffy.
                
                ## Requirements
                - Ruby >= 3.0
                - PostgreSQL
                
                ## Getting Started
                1. Install bundle: `bundle install`
                2. Configure database in `.env` or `config/database.yml`
                3. Create & migrate database: `bin/rails db:prepare`
                4. Start rails server: `bin/rails server`
                """.formatted(diagram.getProjectName());
    }

    private String generateRoutes(DiagramDto diagram) {
        StringBuilder sb = new StringBuilder();
        for (EntityDto entity : diagram.getEntities()) {
            sb.append("      resources :").append(toPlural(toSnakeCase(entity.getName()))).append("\n");
        }
        return """
                Rails.application.routes.draw do
                  namespace :api do
                    namespace :v1 do
                %s    end
                  end
                end
                """.formatted(sb.toString());
    }

    private String generateDatabaseYml(DiagramDto diagram) {
        String dbName = toSnakeCase(diagram.getProjectName());
        return """
                default: &default
                  adapter: postgresql
                  encoding: unicode
                  pool: <%%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %%>
                  username: <%%= ENV.fetch("DATABASE_USER") { "postgres" } %%>
                  password: <%%= ENV.fetch("DATABASE_PASSWORD") { "postgres" } %%>
                  host: <%%= ENV.fetch("DATABASE_HOST") { "localhost" } %%>
                
                development:
                  <<: *default
                  database: %s_development
                
                test:
                  <<: *default
                  database: %s_test
                
                production:
                  <<: *default
                  url: <%%= ENV['DATABASE_URL'] %%>
                """.formatted(dbName, dbName);
    }

    private String generateApplicationRecord() {
        return """
                class ApplicationRecord < ActiveRecord::Base
                  primary_abstract_class
                end
                """;
    }

    private String generateApplicationController() {
        return """
                class ApplicationController < ActionController::API
                end
                """;
    }

    private String generateModel(EntityDto entity, DiagramDto diagram) {
        StringBuilder associations = new StringBuilder();
        StringBuilder validations = new StringBuilder();

        if (entity.isSoftDelete()) {
            associations.append("  acts_as_paranoid\n");
        }

        // Validations from properties
        for (AttributeDto attr : entity.getAttributes()) {
            if (attr.isPrimaryKey()) continue;

            List<String> validOptions = new ArrayList<>();
            if (!attr.isNullable()) {
                validOptions.add("presence: true");
            }
            if (attr.isUnique()) {
                validOptions.add("uniqueness: true");
            }

            if (attr.getValidation() != null) {
                if (attr.getValidation().isRequired() && attr.isNullable()) {
                    // if it wasn't caught by !isNullable()
                    validOptions.add("presence: true");
                }
                if (attr.getValidation().isEmail()) {
                    validOptions.add("format: { with: URI::MailTo::EMAIL_REGEXP }");
                }
                if (attr.getValidation().getMinSize() != null || attr.getValidation().getMaxSize() != null) {
                    List<String> lenOpts = new ArrayList<>();
                    if (attr.getValidation().getMinSize() != null) {
                        lenOpts.add("minimum: " + attr.getValidation().getMinSize());
                    }
                    if (attr.getValidation().getMaxSize() != null) {
                        lenOpts.add("maximum: " + attr.getValidation().getMaxSize());
                    }
                    validOptions.add("length: { " + String.join(", ", lenOpts) + " }");
                }
            }

            if ("Enum".equalsIgnoreCase(attr.getType()) && attr.getEnumValues() != null && !attr.getEnumValues().isEmpty()) {
                String constName = attr.getName().toUpperCase() + "_VALUES";
                String vals = attr.getEnumValues().stream().map(v -> "\"" + v + "\"").collect(Collectors.joining(", "));
                associations.append("  ").append(constName).append(" = %w[").append(String.join(" ", attr.getEnumValues())).append("].freeze\n");
                validOptions.add("inclusion: { in: " + constName + " }");
            }

            if (!validOptions.isEmpty()) {
                validations.append("  validates :").append(attr.getName()).append(", ").append(String.join(", ", validOptions)).append("\n");
            }
        }

        // Associations from relationships
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());
                if (!isFrom && !isTo) continue;

                String target = isFrom ? rel.getTo() : rel.getFrom();
                String targetSnake = toSnakeCase(target);

                if ("ONE_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        associations.append("  has_many :").append(toPlural(targetSnake)).append(", dependent: :destroy\n");
                    } else {
                        associations.append("  belongs_to :").append(targetSnake).append("\n");
                    }
                } else if ("MANY_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        associations.append("  belongs_to :").append(targetSnake).append("\n");
                    } else {
                        associations.append("  has_many :").append(toPlural(targetSnake)).append(", dependent: :destroy\n");
                    }
                } else if ("ONE_TO_ONE".equalsIgnoreCase(rel.getType())) {
                    if (isFrom) {
                        associations.append("  belongs_to :").append(targetSnake).append("\n");
                    } else {
                        associations.append("  has_one :").append(targetSnake).append("\n");
                    }
                } else if ("MANY_TO_MANY".equalsIgnoreCase(rel.getType())) {
                    associations.append("  has_and_belongs_to_many :").append(toPlural(targetSnake)).append("\n");
                }
            }
        }

        return """
                class %s < ApplicationRecord
                %s
                %s
                end
                """.formatted(entity.getName(), associations.toString(), validations.toString());
    }

    private String generateController(EntityDto entity, DiagramDto diagram) {
        String entitySnake = toSnakeCase(entity.getName());
        String entityPlural = toPlural(entitySnake);

        String permitParams = entity.getAttributes().stream()
                .filter(a -> !a.isPrimaryKey())
                .map(a -> ":" + a.getName())
                .collect(Collectors.joining(", "));

        // Add foreign key permit params
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());
                if (!isFrom && !isTo) continue;

                boolean isOwner = ("ONE_TO_MANY".equalsIgnoreCase(rel.getType()) && isTo)
                        || ("MANY_TO_ONE".equalsIgnoreCase(rel.getType()) && isFrom)
                        || ("ONE_TO_ONE".equalsIgnoreCase(rel.getType()) && isFrom);

                if (isOwner) {
                    String fk = getForeignKeyColumn(rel);
                    permitParams += ", :" + fk;
                }
            }
        }

        return """
                class Api::V1::%sController < ApplicationController
                  before_action :set_%s, only: [:show, :update, :destroy]
                
                  def index
                    @%s = %s.all
                    render json: @%s
                  end
                
                  def show
                    render json: @%s
                  end
                
                  def create
                    @%s = %s.new(%s_params)
                    if @%s.save
                      render json: @%s, status: :created
                    else
                      render json: @%s.errors, status: :unprocessable_entity
                    end
                  end
                
                  def update
                    if @%s.update(%s_params)
                      render json: @%s
                    else
                      render json: @%s.errors, status: :unprocessable_entity
                    end
                  end
                
                  def destroy
                    @%s.destroy
                    head :no_content
                  end
                
                  private
                
                  def set_%s
                    @%s = %s.find(params[:id])
                  rescue ActiveRecord::RecordNotFound
                    render json: { error: 'Resource not found' }, status: :not_found
                  end
                
                  def %s_params
                    params.require(:%s).permit(%s)
                  end
                end
                """.formatted(
                toPlural(entity.getName()), entitySnake,
                entityPlural, entity.getName(), entityPlural,
                entitySnake,
                entitySnake, entity.getName(), entitySnake, entitySnake, entitySnake, entitySnake,
                entitySnake, entitySnake, entitySnake, entitySnake,
                entitySnake,
                entitySnake, entitySnake, entity.getName(),
                entitySnake, entitySnake, permitParams
        );
    }

    private String generateSerializer(EntityDto entity) {
        String attrs = entity.getAttributes().stream()
                .map(a -> ":" + a.getName())
                .collect(Collectors.joining(", "));
        return """
                class %sSerializer < ActiveModel::Serializer
                  attributes %s
                end
                """.formatted(entity.getName(), attrs);
    }

    private String generateMigration(EntityDto entity, DiagramDto diagram) {
        StringBuilder fields = new StringBuilder();
        boolean hasUUID = false;

        for (AttributeDto attr : entity.getAttributes()) {
            if (attr.isPrimaryKey()) {
                if ("UUID".equalsIgnoreCase(attr.getType())) {
                    hasUUID = true;
                    // PK is set to uuid explicitly
                }
                continue;
            }
            fields.append("      t.").append(getMigrationType(attr)).append(" :").append(attr.getName());

            List<String> opts = new ArrayList<>();
            if (!attr.isNullable()) {
                opts.add("null: false");
            }
            if (attr.getDefaultValue() != null && !attr.getDefaultValue().trim().isEmpty()) {
                opts.add("default: " + formatMigrationDefault(attr));
            }
            if (!opts.isEmpty()) {
                fields.append(", ").append(String.join(", ", opts));
            }
            fields.append("\n");

            if (attr.isUnique()) {
                fields.append("      t.index :").append(attr.getName()).append(", unique: true\n");
            }
        }

        // Relational reference fields
        if (diagram.getRelationships() != null) {
            for (RelationshipDto rel : diagram.getRelationships()) {
                boolean isFrom = rel.getFrom().equalsIgnoreCase(entity.getName());
                boolean isTo = rel.getTo().equalsIgnoreCase(entity.getName());
                if (!isFrom && !isTo) continue;

                boolean isOwner = ("ONE_TO_MANY".equalsIgnoreCase(rel.getType()) && isTo)
                        || ("MANY_TO_ONE".equalsIgnoreCase(rel.getType()) && isFrom)
                        || ("ONE_TO_ONE".equalsIgnoreCase(rel.getType()) && isFrom);

                if (isOwner) {
                    String target = isFrom ? rel.getTo() : rel.getFrom();
                    String targetSnake = toSnakeCase(target);

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

                    fields.append("      t.references :").append(targetSnake)
                            .append(", null: false, foreign_key: true");
                    if ("UUID".equalsIgnoreCase(pkType)) {
                        fields.append(", type: :uuid");
                    }
                    fields.append("\n");
                }
            }
        }

        if (entity.isSoftDelete()) {
            fields.append("      t.datetime :deleted_at\n");
            fields.append("      t.index :deleted_at\n");
        }

        String uuidExt = hasUUID ? "    enable_extension 'pgcrypto'\n" : "";
        String pkArg = hasUUID ? ", id: :uuid" : "";

        return """
                class Create%s < ActiveRecord::Migration[7.1]
                  def change
                %s    create_table :%s%s do |t|
                %s
                      t.timestamps
                    end
                  end
                end
                """.formatted(toPlural(entity.getName()), uuidExt, toPlural(toSnakeCase(entity.getName())), pkArg, fields.toString().stripTrailing());
    }

    private String generateJoinTableMigration(RelationshipDto rel) {
        String fromTable = toPlural(toSnakeCase(rel.getFrom()));
        String toTable = toPlural(toSnakeCase(rel.getTo()));
        String fromCol = toSnakeCase(rel.getFrom()) + "_id";
        String toCol = toSnakeCase(rel.getTo()) + "_id";

        return """
                class CreateJoinTable%s%s < ActiveRecord::Migration[7.1]
                  def change
                    create_join_table :%s, :%s do |t|
                      t.index [:%s, :%s]
                      t.index [:%s, :%s]
                    end
                  end
                end
                """.formatted(rel.getFrom(), rel.getTo(), fromTable, toTable, fromCol, toCol, toCol, fromCol);
    }

    private String generateSpec(EntityDto entity) {
        return """
                require 'rails_helper'
                
                RSpec.describe %s, type: :model do
                  it "is valid with valid attributes" do
                    # spec implementation placeholder
                  end
                end
                """.formatted(entity.getName());
    }

    private String generateRailsHelper() {
        return """
                ENV['RAILS_ENV'] ||= 'test'
                require_relative '../config/environment'
                abort("The Rails environment is running in production mode!") if Rails.env.production?
                require 'rspec/rails'
                
                RSpec.configure do |config|
                  config.fixture_paths = ["#{::Rails.root}/spec/fixtures"]
                  config.use_transactional_fixtures = true
                  config.infer_spec_type_from_file_location!
                  config.filter_rails_from_backtrace!
                end
                """;
    }

    private String generateDockerfile() {
        return """
                FROM ruby:3.2
                RUN apt-get update -qq && apt-get install -y nodejs postgresql-client
                WORKDIR /app
                COPY Gemfile Gemfile.lock ./
                RUN bundle install
                COPY . .
                EXPOSE 3000
                CMD ["rails", "server", "-b", "0.0.0.0"]
                """;
    }

    private String generateDockerCompose(DiagramDto diagram) {
        return """
                version: '3.8'
                services:
                  web:
                    build: .
                    ports:
                      - "3000:3000"
                    volumes:
                      - .:/app
                    environment:
                      - DATABASE_URL=postgres://postgres:postgres@db:5432/%s
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

    private String getMigrationType(AttributeDto attr) {
        String type = attr.getType().toLowerCase();
        switch (type) {
            case "string":
                return "string";
            case "integer":
            case "int":
                return "integer";
            case "long":
                return "bigint";
            case "uuid":
                return "uuid";
            case "boolean":
                return "boolean";
            case "localdate":
                return "date";
            case "localdatetime":
                return "datetime";
            case "bigdecimal":
                return "decimal";
            case "enum":
            default:
                return "string";
        }
    }

    private String formatMigrationDefault(AttributeDto attr) {
        String val = attr.getDefaultValue();
        if (val == null) return "nil";
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
