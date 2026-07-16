from rest_framework import serializers
from .models import <#list preparedEntities as entity>${entity.name}<#if entity?has_next>, </#if></#list>
<#list preparedEntities as entity>


class ${entity.name}Serializer(serializers.ModelSerializer):
    """Serializer for ${entity.name}."""

    class Meta:
        model = ${entity.name}
        fields = [
<#list entity.attributes as attr>
            '${attr.columnName}',
</#list>
<#list entity.relations as rel>
<#if rel.relationType == "ForeignKey" || rel.relationType == "OneToOneField">
            '${rel.fieldName}',
<#elseif rel.relationType == "ManyToManyField">
            '${rel.fieldName}',
</#if>
</#list>
        ]
<#assign readOnlyFields = []>
<#list entity.attributes as attr>
<#if attr.primaryKey>
<#assign readOnlyFields = readOnlyFields + [attr.columnName]>
</#if>
</#list>
<#if (readOnlyFields?size > 0)>
        read_only_fields = [<#list readOnlyFields as f>'${f}'<#if f?has_next>, </#if></#list>]
</#if>
</#list>
