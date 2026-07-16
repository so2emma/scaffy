from django.db import models
<#list preparedEntities as entity>


<#if entity.enums?has_content>
<#list entity.enums as enum>
class ${enum.enumClassName}(models.TextChoices):
<#list enum.values as val>
    ${val} = '${val}', '${val}'
</#list>


</#list>
</#if>
class ${entity.name}(models.Model):
    """Model for ${entity.name}."""
<#list entity.attributes as attr>
<#if attr.primaryKey>
<#if attr.type?lower_case == "uuid">
    ${attr.columnName} = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
<#elseif attr.type?lower_case == "long" || attr.type?lower_case == "integer" || attr.type?lower_case == "int">
    ${attr.columnName} = models.AutoField(primary_key=True)
<#else>
    ${attr.columnName} = models.${attr.djangoFieldType}(primary_key=True)
</#if>
<#else>
<#if attr.type?lower_case == "enum">
    ${attr.columnName} = models.CharField(max_length=50, choices=${attr.enumClassName}.choices<#if attr.nullable>, null=True, blank=True</#if><#if attr.defaultValue??>, default='${attr.defaultValue}'</#if>)
<#else>
    ${attr.columnName} = models.${attr.djangoFieldType}(${attr.fieldArgs})
</#if>
</#if>
</#list>
<#list entity.relations as rel>
<#if rel.relationType == "ForeignKey">
    ${rel.fieldName} = models.ForeignKey('${rel.targetType}', on_delete=models.CASCADE, related_name='${rel.relatedName}'<#if rel.nullable>, null=True, blank=True</#if>)
<#elseif rel.relationType == "OneToOneField">
    ${rel.fieldName} = models.OneToOneField('${rel.targetType}', on_delete=models.CASCADE, related_name='${rel.relatedName}'<#if rel.nullable>, null=True, blank=True</#if>)
<#elseif rel.relationType == "ManyToManyField">
    ${rel.fieldName} = models.ManyToManyField('${rel.targetType}', related_name='${rel.relatedName}', blank=True)
</#if>
</#list>
<#if entity.softDelete>
    deleted_at = models.DateTimeField(null=True, blank=True)
</#if>

    class Meta:
        db_table = '${entity.tableName}'
<#if entity.softDelete>
        ordering = ['-${entity.primaryKeyColumnName}']
</#if>

    def __str__(self):
        return f"${entity.name}({self.${entity.primaryKeyColumnName}})"
</#list>
