-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'USER',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    diagram_json     TEXT NOT NULL,
    target_framework VARCHAR(50),
    is_public        BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorited     BOOLEAN NOT NULL DEFAULT FALSE,
    entity_count     INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project version history
CREATE TABLE project_versions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    diagram_json   TEXT NOT NULL,
    note           VARCHAR(255),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (project_id, version_number)
);

-- User templates
CREATE TABLE user_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    icon            VARCHAR(50) DEFAULT 'Package',
    diagram_json    TEXT NOT NULL,
    entity_count    INTEGER NOT NULL DEFAULT 0,
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user_id       ON projects(user_id);
CREATE INDEX idx_projects_last_accessed ON projects(user_id, last_accessed_at DESC);
CREATE INDEX idx_projects_favorites     ON projects(user_id, is_favorited) WHERE is_favorited = TRUE;
CREATE INDEX idx_project_versions       ON project_versions(project_id, version_number DESC);
CREATE INDEX idx_user_templates_user    ON user_templates(user_id);
CREATE INDEX idx_user_templates_public  ON user_templates(is_public) WHERE is_public = TRUE;
