export interface FeatureMeta {
  id: string;
  label: string;
  enabledByDefault: boolean;
}

export const FRAMEWORK_FEATURES: Record<string, FeatureMeta[]> = {
  SPRING_BOOT: [
    { id: 'openApi', label: 'OpenAPI / Swagger Docs', enabledByDefault: false },
    { id: 'mockitoTests', label: 'Mockito Unit Tests', enabledByDefault: false },
    { id: 'flywayMigration', label: 'Flyway SQL Migrations', enabledByDefault: false },
    { id: 'lombok', label: 'Lombok Annotations', enabledByDefault: true },
  ],
  EXPRESS: [
    { id: 'jestTests', label: 'Jest Unit Tests', enabledByDefault: false },
    { id: 'swaggerJSDoc', label: 'Swagger JSDoc', enabledByDefault: false },
    { id: 'dockerFile', label: 'Dockerfile + Compose', enabledByDefault: false },
  ],
  FASTAPI: [
    { id: 'openApi', label: 'OpenAPI / Swagger Docs', enabledByDefault: true },
    { id: 'alembicMigrations', label: 'Alembic Migrations', enabledByDefault: false },
    { id: 'pytestStubs', label: 'Pytest Stubs', enabledByDefault: false },
  ],
  NESTJS: [
    { id: 'openApi', label: 'OpenAPI / Swagger Docs', enabledByDefault: false },
    { id: 'jestTests', label: 'Jest Unit Tests', enabledByDefault: false },
    { id: 'dockerFile', label: 'Dockerfile + Compose', enabledByDefault: false },
    { id: 'typeorm', label: 'TypeORM Entities', enabledByDefault: true },
  ],
  DJANGO_REST: [
    { id: 'openApi', label: 'drf-spectacular Docs', enabledByDefault: false },
    { id: 'pytestStubs', label: 'APITestCase Stubs', enabledByDefault: false },
    { id: 'corsHeaders', label: 'CORS Headers', enabledByDefault: true },
  ],
};

export function getDefaultFeaturesForFramework(framework: string): Record<string, boolean> {
  const features = FRAMEWORK_FEATURES[framework] || [];
  const defaults: Record<string, boolean> = {};
  for (const feature of features) {
    defaults[feature.id] = feature.enabledByDefault;
  }
  return defaults;
}
