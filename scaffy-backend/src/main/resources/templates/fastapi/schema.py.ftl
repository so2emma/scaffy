from pydantic import BaseModel, Field
from typing import Optional, List
import datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum

<#list enums as enum>
class ${enum.enumClassName}(str, Enum):
    <#list enum.values as val>
    ${val} = "${val}"
    </#list>

</#list>
# Shared properties
class ${name}Base(BaseModel):
<#list attributes as attr>
<#if !attr.primaryKey>
    <#if attr.type == "Enum">
    ${toSnakeCase(attr.name)}: <#if attr.nullable>Optional[${attr.enumClassName}]<#else>${attr.enumClassName}</#if><#if attr.nullable> = <#if attr.defaultValue??>"${attr.defaultValue}"<#else>None</#if><#elseif attr.defaultValue??> = "${attr.defaultValue}"</#if>
    <#else>
    ${toSnakeCase(attr.name)}: <#if attr.nullable>Optional[${attr.pythonType}]<#else>${attr.pythonType}</#if><#if attr.nullable> = <#if attr.defaultValue??>${attr.defaultValue}<#else>None</#if><#elseif attr.defaultValue??> = ${attr.defaultValue}</#if>
    </#if>
</#if>
</#list>

# Properties to receive on creation
class ${name}Create(${name}Base):
    pass

# Properties to receive on update
class ${name}Update(BaseModel):
<#list attributes as attr>
<#if !attr.primaryKey>
    <#if attr.type == "Enum">
    ${toSnakeCase(attr.name)}: Optional[${attr.enumClassName}] = None
    <#else>
    ${toSnakeCase(attr.name)}: Optional[${attr.pythonType}] = None
    </#if>
</#if>
</#list>

# Properties stored in DB
class ${name}InDBBase(${name}Base):
    ${toSnakeCase(primaryKeyName)}: ${primaryKeyTypePython}

    class Config:
        from_attributes = True

# Properties to return to client
class ${name}(${name}InDBBase):
    pass
