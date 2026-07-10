package ${basePackage}.service;

import ${basePackage}.entity.${name};
import ${basePackage}.dto.${name}RequestDto;
import ${basePackage}.dto.${name}ResponseDto;
import ${basePackage}.mapper.${name}Mapper;
import ${basePackage}.repository.${name}Repository;
import ${basePackage}.service.impl.${name}ServiceImpl;
import ${basePackage}.exception.ResourceNotFoundException;

// Import target repositories for relationships
<#list relationRepositories as repo>
import ${basePackage}.repository.${repo.repositoryType};
import ${basePackage}.entity.${repo.entityType};
</#list>

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ${name}ServiceImplTest {

    @Mock
    private ${name}Repository ${name?uncap_first}Repository;

    @Mock
    private ${name}Mapper ${name?uncap_first}Mapper;

    <#list relationRepositories as repo>
    @Mock
    private ${repo.repositoryType} ${repo.repositoryName?uncap_first};
    </#list>

    @InjectMocks
    private ${name}ServiceImpl ${name?uncap_first}Service;

    @Test
    public void testGetAll() {
        Pageable pageable = PageRequest.of(0, 10);
        ${name} entity = new ${name}();
        Page<${name}> page = new PageImpl<>(List.of(entity));
        
        when(${name?uncap_first}Repository.findAll(pageable)).thenReturn(page);
        when(${name?uncap_first}Mapper.toDto(any(${name}.class))).thenReturn(new ${name}ResponseDto());

        Page<${name}ResponseDto> result = ${name?uncap_first}Service.getAll(pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(${name?uncap_first}Repository, times(1)).findAll(pageable);
    }

    @Test
    public void testGetById_Success() {
        ${primaryKeyType} id = <#if primaryKeyType == "Long">1L<#elseif primaryKeyType == "Integer">1<#elseif primaryKeyType == "UUID">UUID.randomUUID()<#else>"id"</#if>;
        ${name} entity = new ${name}();
        
        when(${name?uncap_first}Repository.findById(id)).thenReturn(Optional.of(entity));
        when(${name?uncap_first}Mapper.toDto(entity)).thenReturn(new ${name}ResponseDto());

        ${name}ResponseDto result = ${name?uncap_first}Service.getById(id);

        assertNotNull(result);
        verify(${name?uncap_first}Repository, times(1)).findById(id);
    }

    @Test
    public void testGetById_NotFound() {
        ${primaryKeyType} id = <#if primaryKeyType == "Long">1L<#elseif primaryKeyType == "Integer">1<#elseif primaryKeyType == "UUID">UUID.randomUUID()<#else>"id"</#if>;
        when(${name?uncap_first}Repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            ${name?uncap_first}Service.getById(id);
        });
    }

    @Test
    public void testCreate() {
        ${name}RequestDto dto = new ${name}RequestDto();
        ${name} entity = new ${name}();
        ${name} savedEntity = new ${name}();
        ${name}ResponseDto responseDto = new ${name}ResponseDto();

        when(${name?uncap_first}Mapper.toEntity(dto)).thenReturn(entity);
        when(${name?uncap_first}Repository.save(entity)).thenReturn(savedEntity);
        when(${name?uncap_first}Mapper.toDto(savedEntity)).thenReturn(responseDto);

        ${name}ResponseDto result = ${name?uncap_first}Service.create(dto);

        assertNotNull(result);
        verify(${name?uncap_first}Repository, times(1)).save(entity);
    }

    @Test
    public void testUpdate_Success() {
        ${primaryKeyType} id = <#if primaryKeyType == "Long">1L<#elseif primaryKeyType == "Integer">1<#elseif primaryKeyType == "UUID">UUID.randomUUID()<#else>"id"</#if>;
        ${name}RequestDto dto = new ${name}RequestDto();
        ${name} entity = new ${name}();
        ${name} savedEntity = new ${name}();
        ${name}ResponseDto responseDto = new ${name}ResponseDto();

        when(${name?uncap_first}Repository.findById(id)).thenReturn(Optional.of(entity));
        when(${name?uncap_first}Repository.save(entity)).thenReturn(savedEntity);
        when(${name?uncap_first}Mapper.toDto(savedEntity)).thenReturn(responseDto);

        ${name}ResponseDto result = ${name?uncap_first}Service.update(id, dto);

        assertNotNull(result);
        verify(${name?uncap_first}Mapper, times(1)).updateEntityFromDto(dto, entity);
    }

    @Test
    public void testDelete_Success() {
        ${primaryKeyType} id = <#if primaryKeyType == "Long">1L<#elseif primaryKeyType == "Integer">1<#elseif primaryKeyType == "UUID">UUID.randomUUID()<#else>"id"</#if>;
        when(${name?uncap_first}Repository.existsById(id)).thenReturn(true);

        ${name?uncap_first}Service.delete(id);

        verify(${name?uncap_first}Repository, times(1)).deleteById(id);
    }

    @Test
    public void testDelete_NotFound() {
        ${primaryKeyType} id = <#if primaryKeyType == "Long">1L<#elseif primaryKeyType == "Integer">1<#elseif primaryKeyType == "UUID">UUID.randomUUID()<#else>"id"</#if>;
        when(${name?uncap_first}Repository.existsById(id)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> {
            ${name?uncap_first}Service.delete(id);
        });
    }
}
