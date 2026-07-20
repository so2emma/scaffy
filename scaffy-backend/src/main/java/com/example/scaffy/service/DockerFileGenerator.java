package com.example.scaffy.service;

public final class DockerFileGenerator {

    private DockerFileGenerator() {
        // Utility class
    }

    public static String generateDockerfile(String framework, String projectName) {
        String nameSnake = toSnakeCase(projectName);
        if (framework == null) framework = "";

        switch (framework.toUpperCase()) {
            case "SPRING_BOOT":
                return """
                        FROM eclipse-temurin:21-jdk-alpine AS build
                        WORKDIR /app
                        COPY pom.xml .
                        COPY src ./src
                        RUN ./mvnw package -DskipTests
                        FROM eclipse-temurin:21-jre-alpine
                        WORKDIR /app
                        COPY --from=build /app/target/*.jar app.jar
                        EXPOSE 8080
                        ENTRYPOINT ["java", "-jar", "app.jar"]
                        """;

            case "EXPRESS":
                return """
                        FROM node:20-alpine AS deps
                        WORKDIR /app
                        COPY package*.json ./
                        RUN npm ci
                        FROM node:20-alpine
                        WORKDIR /app
                        COPY --from=deps /app/node_modules ./node_modules
                        COPY . .
                        RUN npx prisma generate
                        EXPOSE 3000
                        CMD ["npm", "start"]
                        """;

            case "FASTAPI":
                return """
                        FROM python:3.12-slim
                        WORKDIR /app
                        COPY requirements.txt .
                        RUN pip install --no-cache-dir -r requirements.txt
                        COPY . .
                        EXPOSE 8000
                        CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
                        """;

            case "NESTJS":
                return """
                        FROM node:20-alpine AS build
                        WORKDIR /app
                        COPY package*.json ./
                        RUN npm ci
                        COPY . .
                        RUN npm run build
                        FROM node:20-alpine
                        WORKDIR /app
                        COPY --from=build /app/node_modules ./node_modules
                        COPY --from=build /app/dist ./dist
                        EXPOSE 3000
                        CMD ["node", "dist/main"]
                        """;

            case "DJANGO_REST":
                return """
                        FROM python:3.12-slim
                        WORKDIR /app
                        COPY requirements.txt .
                        RUN pip install --no-cache-dir -r requirements.txt
                        COPY . .
                        EXPOSE 8000
                        CMD ["gunicorn", "%s.wsgi:application", "--bind", "0.0.0.0:8000"]
                        """.formatted(nameSnake);

            case "LARAVEL":
                return """
                        FROM php:8.3-fpm-alpine
                        RUN apk add --no-cache libpq-dev git unzip zip \\
                            && docker-php-ext-install pdo pdo_pgsql
                        COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
                        WORKDIR /var/www
                        COPY composer.json composer.lock ./
                        RUN composer install --no-dev --optimize-autoloader
                        COPY . .
                        EXPOSE 8000
                        CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
                        """;

            case "GIN":
                return """
                        FROM golang:1.22-alpine AS build
                        WORKDIR /app
                        COPY go.mod go.sum ./
                        RUN go mod download
                        COPY . .
                        RUN go build -o server ./cmd/server
                        FROM alpine:3.19
                        WORKDIR /app
                        COPY --from=build /app/server .
                        EXPOSE 8080
                        CMD ["./server"]
                        """;

            case "RAILS":
                return """
                        FROM ruby:3.3-alpine
                        RUN apk add --no-cache build-base postgresql-dev nodejs yarn tzdata
                        WORKDIR /app
                        COPY Gemfile Gemfile.lock ./
                        RUN bundle install
                        COPY . .
                        EXPOSE 3000
                        CMD ["rails", "server", "-b", "0.0.0.0"]
                        """;

            default:
                return "# Dockerfile not supported for framework: " + framework + "\n";
        }
    }

    public static String generateDockerCompose(String framework, String projectName) {
        String nameSnake = toSnakeCase(projectName);
        if (framework == null) framework = "";

        switch (framework.toUpperCase()) {
            case "SPRING_BOOT":
                return """
                        version: '3.8'
                        services:
                          app:
                            build: .
                            ports:
                              - "8080:8080"
                            environment:
                              SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/%s_db
                              SPRING_DATASOURCE_USERNAME: postgres
                              SPRING_DATASOURCE_PASSWORD: postgres
                            depends_on:
                              - db
                          db:
                            image: postgres:16-alpine
                            environment:
                              POSTGRES_DB: %s_db
                              POSTGRES_USER: postgres
                              POSTGRES_PASSWORD: postgres
                            ports:
                              - "5432:5432"
                            volumes:
                              - postgres_data:/var/lib/postgresql/data
                        volumes:
                          postgres_data:
                        """.formatted(nameSnake, nameSnake);

            case "EXPRESS":
            case "NESTJS":
                return """
                        version: '3.8'
                        services:
                          app:
                            build: .
                            ports:
                              - "3000:3000"
                            environment:
                              DATABASE_URL: postgresql://postgres:postgres@db:5432/%s_db
                            depends_on:
                              - db
                          db:
                            image: postgres:16-alpine
                            environment:
                              POSTGRES_DB: %s_db
                              POSTGRES_USER: postgres
                              POSTGRES_PASSWORD: postgres
                            ports:
                              - "5432:5432"
                            volumes:
                              - postgres_data:/var/lib/postgresql/data
                        volumes:
                          postgres_data:
                        """.formatted(nameSnake, nameSnake);

            case "FASTAPI":
                return """
                        version: '3.8'
                        services:
                          api:
                            build: .
                            ports:
                              - "8000:8000"
                            environment:
                              DATABASE_URL: postgresql+psycopg2://postgres:postgres@db:5432/%s_db
                            depends_on:
                              - db
                          db:
                            image: postgres:16-alpine
                            environment:
                              POSTGRES_DB: %s_db
                              POSTGRES_USER: postgres
                              POSTGRES_PASSWORD: postgres
                            ports:
                              - "5432:5432"
                            volumes:
                              - postgres_data:/var/lib/postgresql/data
                        volumes:
                          postgres_data:
                        """.formatted(nameSnake, nameSnake);

            case "DJANGO_REST":
                return """
                        version: '3.8'
                        services:
                          api:
                            build: .
                            ports:
                              - "8000:8000"
                            environment:
                              DATABASE_URL: postgresql://postgres:postgres@db:5432/%s_db
                            command: sh -c "python manage.py migrate && gunicorn %s.wsgi:application --bind 0.0.0.0:8000"
                            depends_on:
                              - db
                          db:
                            image: postgres:16-alpine
                            environment:
                              POSTGRES_DB: %s_db
                              POSTGRES_USER: postgres
                              POSTGRES_PASSWORD: postgres
                            ports:
                              - "5432:5432"
                            volumes:
                              - postgres_data:/var/lib/postgresql/data
                        volumes:
                          postgres_data:
                        """.formatted(nameSnake, nameSnake, nameSnake);

            case "LARAVEL":
                return """
                        version: '3.8'
                        services:
                          app:
                            build: .
                            ports:
                              - "8000:8000"
                            environment:
                              DB_CONNECTION: pgsql
                              DB_HOST: db
                              DB_PORT: 5432
                              DB_DATABASE: %s_db
                              DB_USERNAME: postgres
                              DB_PASSWORD: postgres
                            depends_on:
                              - db
                          db:
                            image: postgres:16-alpine
                            environment:
                              POSTGRES_DB: %s_db
                              POSTGRES_USER: postgres
                              POSTGRES_PASSWORD: postgres
                            ports:
                              - "5432:5432"
                            volumes:
                              - postgres_data:/var/lib/postgresql/data
                        volumes:
                          postgres_data:
                        """.formatted(nameSnake, nameSnake);

            case "GIN":
                return """
                        version: '3.8'
                        services:
                          app:
                            build: .
                            ports:
                              - "8080:8080"
                            environment:
                              DATABASE_URL: postgres://postgres:postgres@db:5432/%s_db?sslmode=disable
                            depends_on:
                              - db
                          db:
                            image: postgres:16-alpine
                            environment:
                              POSTGRES_DB: %s_db
                              POSTGRES_USER: postgres
                              POSTGRES_PASSWORD: postgres
                            ports:
                              - "5432:5432"
                            volumes:
                              - postgres_data:/var/lib/postgresql/data
                        volumes:
                          postgres_data:
                        """.formatted(nameSnake, nameSnake);

            case "RAILS":
                return """
                        version: '3.8'
                        services:
                          web:
                            build: .
                            ports:
                              - "3000:3000"
                            command: sh -c "bin/rails db:prepare && bin/rails server -b 0.0.0.0"
                            environment:
                              DATABASE_URL: postgres://postgres:postgres@db:5432/%s_db
                            depends_on:
                              - db
                          db:
                            image: postgres:16-alpine
                            environment:
                              POSTGRES_DB: %s_db
                              POSTGRES_USER: postgres
                              POSTGRES_PASSWORD: postgres
                            ports:
                              - "5432:5432"
                            volumes:
                              - postgres_data:/var/lib/postgresql/data
                        volumes:
                          postgres_data:
                        """.formatted(nameSnake, nameSnake);

            default:
                return "# docker-compose not supported for framework: " + framework + "\n";
        }
    }

    public static String generateGithubActionsWorkflow(String framework, String projectName) {
        String nameSnake = toSnakeCase(projectName);
        if (framework == null) framework = "";

        switch (framework.toUpperCase()) {
            case "SPRING_BOOT":
                return """
                        name: CI
                        on: [push, pull_request]
                        jobs:
                          build:
                            runs-on: ubuntu-latest
                            steps:
                              - uses: actions/checkout@v4
                              - uses: actions/setup-java@v4
                                with:
                                  java-version: '21'
                                  distribution: 'temurin'
                              - name: Build and test
                                run: mvn verify
                              - name: Build Docker image
                                run: docker build -t %s:latest .
                        """.formatted(nameSnake);

            case "EXPRESS":
                return """
                        name: CI
                        on: [push, pull_request]
                        jobs:
                          build:
                            runs-on: ubuntu-latest
                            steps:
                              - uses: actions/checkout@v4
                              - uses: actions/setup-node@v4
                                with:
                                  node-version: '20'
                              - name: Install dependencies
                                run: npm ci
                              - name: Generate Prisma client
                                run: npx prisma generate
                              - name: Build Docker image
                                run: docker build -t %s:latest .
                        """.formatted(nameSnake);

            case "FASTAPI":
            case "DJANGO_REST":
                return """
                        name: CI
                        on: [push, pull_request]
                        jobs:
                          build:
                            runs-on: ubuntu-latest
                            steps:
                              - uses: actions/checkout@v4
                              - uses: actions/setup-python@v5
                                with:
                                  python-version: '3.12'
                              - name: Install dependencies
                                run: pip install -r requirements.txt
                              - name: Run tests
                                run: pytest
                              - name: Build Docker image
                                run: docker build -t %s:latest .
                        """.formatted(nameSnake);

            case "NESTJS":
                return """
                        name: CI
                        on: [push, pull_request]
                        jobs:
                          build:
                            runs-on: ubuntu-latest
                            steps:
                              - uses: actions/checkout@v4
                              - uses: actions/setup-node@v4
                                with:
                                  node-version: '20'
                              - name: Install dependencies
                                run: npm ci
                              - name: Build application
                                run: npm run build
                              - name: Run tests
                                run: npm test
                              - name: Build Docker image
                                run: docker build -t %s:latest .
                        """.formatted(nameSnake);

            case "LARAVEL":
                return """
                        name: CI
                        on: [push, pull_request]
                        jobs:
                          build:
                            runs-on: ubuntu-latest
                            steps:
                              - uses: actions/checkout@v4
                              - uses: shivammathur/setup-php@v2
                                with:
                                  php-version: '8.3'
                              - name: Install dependencies
                                run: composer install --prefer-dist --no-progress
                              - name: Run tests
                                run: php artisan test
                              - name: Build Docker image
                                run: docker build -t %s:latest .
                        """.formatted(nameSnake);

            case "GIN":
                return """
                        name: CI
                        on: [push, pull_request]
                        jobs:
                          build:
                            runs-on: ubuntu-latest
                            steps:
                              - uses: actions/checkout@v4
                              - uses: actions/setup-go@v5
                                with:
                                  go-version: '1.22'
                              - name: Test
                                run: go test ./...
                              - name: Build binary
                                run: go build -v ./...
                              - name: Build Docker image
                                run: docker build -t %s:latest .
                        """.formatted(nameSnake);

            case "RAILS":
                return """
                        name: CI
                        on: [push, pull_request]
                        jobs:
                          build:
                            runs-on: ubuntu-latest
                            steps:
                              - uses: actions/checkout@v4
                              - uses: ruby/setup-ruby@v1
                                with:
                                  ruby-version: '3.3'
                                  bundler-cache: true
                              - name: Run tests
                                run: bundle exec rspec
                              - name: Build Docker image
                                run: docker build -t %s:latest .
                        """.formatted(nameSnake);

            default:
                return "# CI workflow not supported for framework: " + framework + "\n";
        }
    }

    public static String generateDotEnvExample(String framework, String projectName) {
        String nameSnake = toSnakeCase(projectName);
        if (framework == null) framework = "";

        switch (framework.toUpperCase()) {
            case "SPRING_BOOT":
                return """
                        SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/%s_db
                        SPRING_DATASOURCE_USERNAME=postgres
                        SPRING_DATASOURCE_PASSWORD=postgres
                        """.formatted(nameSnake);

            case "EXPRESS":
            case "NESTJS":
                return """
                        PORT=3000
                        DATABASE_URL=postgresql://postgres:postgres@localhost:5432/%s_db
                        """.formatted(nameSnake);

            case "FASTAPI":
                return """
                        DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/%s_db
                        """.formatted(nameSnake);

            case "DJANGO_REST":
                return """
                        SECRET_KEY=change-me-in-production
                        DEBUG=True
                        DATABASE_URL=postgresql://postgres:postgres@localhost:5432/%s_db
                        """.formatted(nameSnake);

            case "LARAVEL":
                return """
                        APP_NAME=%s
                        APP_ENV=local
                        APP_KEY=
                        APP_DEBUG=true
                        APP_URL=http://localhost:8000

                        DB_CONNECTION=pgsql
                        DB_HOST=127.0.0.1
                        DB_PORT=5432
                        DB_DATABASE=%s_db
                        DB_USERNAME=postgres
                        DB_PASSWORD=postgres
                        """.formatted(projectName, nameSnake);

            case "GIN":
                return """
                        PORT=8080
                        DATABASE_URL=postgres://postgres:postgres@localhost:5432/%s_db?sslmode=disable
                        """.formatted(nameSnake);

            case "RAILS":
                return """
                        DATABASE_URL=postgres://postgres:postgres@localhost:5432/%s_db
                        """.formatted(nameSnake);

            default:
                return "# .env.example not supported for framework: " + framework + "\n";
        }
    }

    private static String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase();
    }
}
