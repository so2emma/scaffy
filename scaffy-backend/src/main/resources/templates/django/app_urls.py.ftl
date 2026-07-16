from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import <#list preparedEntities as entity>${entity.name}ViewSet<#if entity?has_next>, </#if></#list>

router = DefaultRouter()
<#list preparedEntities as entity>
router.register(r'${entity.pluralLowerName}', ${entity.name}ViewSet, basename='${entity.nameLower}')
</#list>

urlpatterns = [
    path('', include(router.urls)),
]
