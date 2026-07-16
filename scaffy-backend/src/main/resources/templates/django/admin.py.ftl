from django.contrib import admin
from .models import <#list preparedEntities as entity>${entity.name}<#if entity?has_next>, </#if></#list>
<#list preparedEntities as entity>


@admin.register(${entity.name})
class ${entity.name}Admin(admin.ModelAdmin):
    list_display = [<#list entity.attributes as attr>'${attr.columnName}'<#if attr?has_next>, </#if></#list>]
<#assign searchFields = []>
<#list entity.attributes as attr>
<#if attr.type?lower_case == "string">
<#assign searchFields = searchFields + [attr.columnName]>
</#if>
</#list>
<#if (searchFields?size > 0)>
    search_fields = [<#list searchFields as f>'${f}'<#if f?has_next>, </#if></#list>]
</#if>
</#list>
