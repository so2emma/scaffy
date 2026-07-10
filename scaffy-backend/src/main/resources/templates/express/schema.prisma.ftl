datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

<#list preparedEntities as entity>
model ${entity.name} {
  <#-- Attributes -->
  <#list entity.attributes as attr>
  <#if attr.primaryKey>
  ${attr.name} ${attr.prismaType} @id<#if attr.prismaType == "Int"> @default(autoincrement())<#elseif attr.type?lower_case == "uuid"> @default(uuid())</#if>
  <#else>
  ${attr.name} ${attr.prismaType}<#if attr.nullable>?</#if><#if attr.unique> @unique</#if><#if attr.prismaDefaultValue??> @default(${attr.prismaDefaultValue})</#if>
  </#if>
  </#list>

  <#if entity.softDelete>
  deleted Boolean @default(false)
  </#if>

  <#-- Relation Fields -->
  <#list entity.prismaRelations as rel>
  ${rel.fieldName} ${rel.fieldModelType}<#if rel.nullable && !rel.isArray>?</#if><#if rel.isArray>[]</#if><#if rel.isOwner> @relation("${rel.relationName}", fields: [${rel.joinColumnName}], references: [${rel.referencedColumnName}])</#if><#if !rel.isOwner && !rel.isArray> @relation("${rel.relationName}")</#if><#if !rel.isOwner && rel.isArray> @relation("${rel.relationName}")</#if>
  <#if rel.isOwner>
  ${rel.joinColumnName} ${rel.joinColumnType}<#if rel.nullable>?</#if><#if rel.isUnique> @unique</#if>
  </#if>
  </#list>
}

</#list>

<#list globalEnums as enum>
// Prisma SQLite does not support native enums, so enums are handled as Strings in database, but we keep comments
// enum ${enum.enumClassName} {
//   <#list enum.values as val>
//   ${val}
//   </#list>
// }
</#list>
