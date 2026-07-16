from rest_framework import viewsets
<#if openApiSupport>
from drf_spectacular.utils import extend_schema, extend_schema_view
</#if>
from .models import <#list preparedEntities as entity>${entity.name}<#if entity?has_next>, </#if></#list>
from .serializers import <#list preparedEntities as entity>${entity.name}Serializer<#if entity?has_next>, </#if></#list>
<#list preparedEntities as entity>


<#if openApiSupport>
@extend_schema_view(
    list=extend_schema(summary='List all ${entity.pluralLowerName}'),
    retrieve=extend_schema(summary='Retrieve a ${entity.nameLower}'),
    create=extend_schema(summary='Create a new ${entity.nameLower}'),
    update=extend_schema(summary='Update a ${entity.nameLower}'),
    partial_update=extend_schema(summary='Partially update a ${entity.nameLower}'),
    destroy=extend_schema(summary='Delete a ${entity.nameLower}'),
)
</#if>
class ${entity.name}ViewSet(viewsets.ModelViewSet):
    """ViewSet for ${entity.name} CRUD operations."""

    queryset = ${entity.name}.objects.all()
    serializer_class = ${entity.name}Serializer
<#if entity.softDelete>

    def get_queryset(self):
        return ${entity.name}.objects.filter(deleted_at__isnull=True)

    def perform_destroy(self, instance):
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save()
</#if>
</#list>
