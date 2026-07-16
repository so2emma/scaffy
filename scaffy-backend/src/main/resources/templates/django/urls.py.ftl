"""
URL configuration for ${projectName} project.
"""

from django.contrib import admin
from django.urls import path, include
<#if openApiSupport>
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
</#if>

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('${appName}.urls')),
<#if openApiSupport>
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
</#if>
]
