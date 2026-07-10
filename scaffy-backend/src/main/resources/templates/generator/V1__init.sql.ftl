<#assign sqlTypes = {
  "Long": "BIGINT",
  "Integer": "INT",
  "String": "VARCHAR(255)",
  "Boolean": "BOOLEAN",
  "Double": "DOUBLE",
  "BigDecimal": "DECIMAL(19, 2)",
  "LocalDate": "DATE",
  "LocalDateTime": "TIMESTAMP",
  "UUID": "UUID"
}>
-- ==========================================
-- Flyway Database Migration: V1__init.sql
-- Generated for project: ${projectName}
-- ==========================================

<#list preparedEntities as entity>
-- Table: ${entity.tableName}
CREATE TABLE ${entity.tableName} (
    <#list entity.attributes as attr>
    ${attr.columnName} <#if attr.type == "Enum">VARCHAR(50)<#elseif attr.type == "String" && attr.validation?? && attr.validation.maxSize??>VARCHAR(${attr.validation.maxSize})<#else>${sqlTypes[attr.type]!"VARCHAR(255)"}</#if><#if !attr.nullable || attr.primaryKey> NOT NULL</#if><#if attr.unique && !attr.primaryKey> UNIQUE</#if><#if attr.defaultValue?? && attr.defaultValue != ""> DEFAULT '${attr.defaultValue}'</#if>,
    </#list>
    <#list entity.relations as rel>
    <#if (rel.relationType == "MANY_TO_ONE" || (rel.relationType == "ONE_TO_ONE" && rel.owner))>
    ${rel.joinColumnName} <#if entityIdTypes[rel.targetType] == "UUID">UUID<#elseif entityIdTypes[rel.targetType] == "Long" || entityIdTypes[rel.targetType] == "Integer">BIGINT<#else>VARCHAR(255)</#if><#if !rel.nullable> NOT NULL</#if>,
    </#if>
    </#list>
    <#if entity.softDelete?? && entity.softDelete>
    deleted_at TIMESTAMP,
    </#if>
    PRIMARY KEY (<#list entity.attributes as attr><#if attr.primaryKey>${attr.columnName}</#if></#list>)
);

</#list>
-- Many-to-Many Join Tables
<#list preparedEntities as entity>
    <#list entity.relations as rel>
        <#if rel.relationType == "MANY_TO_MANY" && rel.owner>
-- Join Table: ${rel.joinTableName}
CREATE TABLE ${rel.joinTableName} (
    ${rel.joinColumnName} <#if entityIdTypes[entity.name] == "UUID">UUID<#elseif entityIdTypes[entity.name] == "Long" || entityIdTypes[entity.name] == "Integer">BIGINT<#else>VARCHAR(255)</#if> NOT NULL,
    ${rel.inverseJoinColumnName} <#if rel.targetIdType == "UUID">UUID<#elseif rel.targetIdType == "Long" || rel.targetIdType == "Integer">BIGINT<#else>VARCHAR(255)</#if> NOT NULL,
    PRIMARY KEY (${rel.joinColumnName}, ${rel.inverseJoinColumnName})
);

        </#if>
    </#list>
</#list>
-- Foreign Key Constraints

<#list preparedEntities as entity>
    <#list entity.relations as rel>
        <#if (rel.relationType == "MANY_TO_ONE" || (rel.relationType == "ONE_TO_ONE" && rel.owner))>
            <#if tableNames[rel.targetType]??>
ALTER TABLE ${entity.tableName}
    ADD CONSTRAINT fk_${entity.tableName}_${rel.joinColumnName}
    FOREIGN KEY (${rel.joinColumnName})
    REFERENCES ${tableNames[rel.targetType]}(${pkColumnNames[rel.targetType]});

            </#if>
        </#if>
    </#list>
</#list>
<#list preparedEntities as entity>
    <#list entity.relations as rel>
        <#if rel.relationType == "MANY_TO_MANY" && rel.owner>
ALTER TABLE ${rel.joinTableName}
    ADD CONSTRAINT fk_${rel.joinTableName}_source
    FOREIGN KEY (${rel.joinColumnName})
    REFERENCES ${entity.tableName}(${pkColumnNames[entity.name]});

            <#if tableNames[rel.targetType]??>
ALTER TABLE ${rel.joinTableName}
    ADD CONSTRAINT fk_${rel.joinTableName}_target
    FOREIGN KEY (${rel.inverseJoinColumnName})
    REFERENCES ${tableNames[rel.targetType]}(${pkColumnNames[rel.targetType]});
            </#if>

        </#if>
    </#list>
</#list>
