from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import <#list preparedEntities as entity>${entity.name}<#if entity?has_next>, </#if></#list>
<#list preparedEntities as entity>


class ${entity.name}APITestCase(APITestCase):
    """Test cases for ${entity.name} API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.${entity.nameLower} = ${entity.name}.objects.create(
<#list entity.attributes as attr>
<#if !attr.primaryKey && !attr.nullable>
            ${attr.columnName}=${attr.testValue},
</#if>
</#list>
        )
        self.list_url = reverse('${entity.nameLower}-list')
        self.detail_url = reverse('${entity.nameLower}-detail', kwargs={'pk': self.${entity.nameLower}.pk})

    def test_list_${entity.nameLower}(self):
        """Test listing all ${entity.pluralLowerName}."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_${entity.nameLower}(self):
        """Test creating a new ${entity.nameLower}."""
        data = {
<#list entity.attributes as attr>
<#if !attr.primaryKey && !attr.nullable>
            '${attr.columnName}': ${attr.testValue},
</#if>
</#list>
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_retrieve_${entity.nameLower}(self):
        """Test retrieving a ${entity.nameLower} by ID."""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_${entity.nameLower}(self):
        """Test updating a ${entity.nameLower}."""
        data = {
<#list entity.attributes as attr>
<#if !attr.primaryKey && !attr.nullable>
            '${attr.columnName}': ${attr.testValue},
</#if>
</#list>
        }
        response = self.client.put(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_${entity.nameLower}(self):
        """Test deleting a ${entity.nameLower}."""
        response = self.client.delete(self.detail_url)
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])
</#list>
