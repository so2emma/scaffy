from sqlalchemy import Column, Integer, String, Boolean, Float, Numeric, DateTime, Date, Time, ForeignKey, Table
from sqlalchemy.orm import relationship
from .base import Base
import datetime
from uuid import UUID
from enum import Enum

<#list enums as enum>
class ${enum.enumClassName}(str, Enum):
    <#list enum.values as val>
    ${val} = "${val}"
    </#list>

</#list>
<#-- Define association tables for MANY_TO_MANY relationships where this entity is the owner -->
<#list relations as rel>
<#if rel.relationType == "MANY_TO_MANY" && rel.owner>
${rel.joinTableName} = Table(
    "${rel.joinTableName}",
    Base.metadata,
    Column("${toSnakeCase(name)}_id", ${primaryKeyTypeSql}, ForeignKey("${tableName}.${primaryKeyColumnName}", ondelete="CASCADE"), primaryKey=True),
    Column("${toSnakeCase(rel.targetType)}_id", ${rel.targetIdTypeSql}, ForeignKey("${rel.targetTableName}.${rel.targetPKColumnName}", ondelete="CASCADE"), primaryKey=True)
)
</#if>
</#list>

class ${name}(Base):
    __tablename__ = "${tableName}"

<#list attributes as attr>
    <#if attr.primaryKey>
    ${toSnakeCase(attr.name)} = Column(${attr.sqlType}, primary_key=True, index=True)
    <#else>
    <#if attr.type == "Enum">
    ${toSnakeCase(attr.name)} = Column(String, nullable=${attr.nullable?string("True", "False")}<#if attr.defaultValue??>, default="${attr.defaultValue}"</#if>)
    <#else>
    ${toSnakeCase(attr.name)} = Column(${attr.sqlType}, nullable=${attr.nullable?string("True", "False")}, unique=${attr.unique?string("True", "False")}<#if attr.defaultValue??>, default=${attr.defaultValue}</#if>)
    </#if>
    </#if>
</#list>
<#if softDelete>
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
</#if>

    # Relationships
<#list relations as rel>
    <#if rel.relationType == "MANY_TO_ONE">
    ${toSnakeCase(rel.fieldName)}_id = Column(${rel.targetIdTypeSql}, ForeignKey("${rel.targetTableName}.${rel.targetPKColumnName}"<#if rel.nullable == false>, nullable=False</#if>))
    ${toSnakeCase(rel.fieldName)} = relationship("${rel.targetType}"<#if rel.otherFieldName??>, back_populates="${toSnakeCase(rel.otherFieldName)}"</#if>)
    <#elseif rel.relationType == "ONE_TO_ONE">
    <#if rel.owner>
    ${toSnakeCase(rel.fieldName)}_id = Column(${rel.targetIdTypeSql}, ForeignKey("${rel.targetTableName}.${rel.targetPKColumnName}"<#if rel.nullable == false>, nullable=False</#if>))
    ${toSnakeCase(rel.fieldName)} = relationship("${rel.targetType}"<#if rel.otherFieldName??>, back_populates="${toSnakeCase(rel.otherFieldName)}"</#if>)
    <#else>
    ${toSnakeCase(rel.fieldName)} = relationship("${rel.targetType}"<#if rel.otherFieldName??>, back_populates="${toSnakeCase(rel.otherFieldName)}"</#if>, uselist=False)
    </#if>
    <#elseif rel.relationType == "ONE_TO_MANY">
    ${toSnakeCase(rel.fieldName)} = relationship("${rel.targetType}"<#if rel.otherFieldName??>, back_populates="${toSnakeCase(rel.otherFieldName)}"</#if>)
    <#elseif rel.relationType == "MANY_TO_MANY">
    <#if rel.owner>
    ${toSnakeCase(rel.fieldName)} = relationship("${rel.targetType}", secondary=${rel.joinTableName}<#if rel.otherFieldName??>, back_populates="${toSnakeCase(rel.otherFieldName)}"</#if>)
    <#else>
    ${toSnakeCase(rel.fieldName)} = relationship("${rel.targetType}", secondary="${rel.joinTableName}"<#if rel.otherFieldName??>, back_populates="${toSnakeCase(rel.otherFieldName)}"</#if>)
    </#if>
    </#if>
</#list>
