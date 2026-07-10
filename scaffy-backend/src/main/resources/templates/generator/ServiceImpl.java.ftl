package ${basePackage}.service.impl;

import ${basePackage}.entity.${name};
import ${basePackage}.dto.${name}RequestDto;
import ${basePackage}.dto.${name}ResponseDto;
import ${basePackage}.mapper.${name}Mapper;
import ${basePackage}.repository.${name}Repository;
import ${basePackage}.service.${name}Service;
import ${basePackage}.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.UUID;
import java.util.ArrayList;

// Import target repositories for relationships
<#list relationRepositories as repo>
import ${basePackage}.repository.${repo.repositoryType};
import ${basePackage}.entity.${repo.entityType};
</#list>

@Service
@RequiredArgsConstructor
@Transactional
public class ${name}ServiceImpl implements ${name}Service {

    private final ${name}Repository ${name?uncap_first}Repository;
    private final ${name}Mapper ${name?uncap_first}Mapper;

    <#list relationRepositories as repo>
    private final ${repo.repositoryType} ${repo.repositoryName?uncap_first};
    </#list>

    @Override
    @Transactional(readOnly = true)
    public Page<${name}ResponseDto> getAll(Pageable pageable) {
        return ${name?uncap_first}Repository.findAll(pageable)
                .map(${name?uncap_first}Mapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public ${name}ResponseDto getById(${primaryKeyType} id) {
        ${name} entity = ${name?uncap_first}Repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("${name}", id));
        return ${name?uncap_first}Mapper.toDto(entity);
    }

    @Override
    public ${name}ResponseDto create(${name}RequestDto dto) {
        ${name} entity = ${name?uncap_first}Mapper.toEntity(dto);
        resolveRelationships(dto, entity);
        ${name} saved = ${name?uncap_first}Repository.save(entity);
        return ${name?uncap_first}Mapper.toDto(saved);
    }

    @Override
    public ${name}ResponseDto update(${primaryKeyType} id, ${name}RequestDto dto) {
        ${name} entity = ${name?uncap_first}Repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("${name}", id));
        
        ${name?uncap_first}Mapper.updateEntityFromDto(dto, entity);
        resolveRelationships(dto, entity);
        ${name} saved = ${name?uncap_first}Repository.save(entity);
        return ${name?uncap_first}Mapper.toDto(saved);
    }

    @Override
    public void delete(${primaryKeyType} id) {
        if (!${name?uncap_first}Repository.existsById(id)) {
            throw new ResourceNotFoundException("${name}", id);
        }
        ${name?uncap_first}Repository.deleteById(id);
    }

    private void resolveRelationships(${name}RequestDto dto, ${name} entity) {
        <#list relations as rel>
        <#if rel.relationType == "ONE_TO_ONE" || rel.relationType == "MANY_TO_ONE">
            <#if rel.owner>
        if (dto.get${rel.fieldName?cap_first}Id() != null) {
            ${rel.targetType} relEntity = ${rel.targetRepositoryName?uncap_first}.findById(dto.get${rel.fieldName?cap_first}Id())
                    .orElseThrow(() -> new ResourceNotFoundException("${rel.targetType}", dto.get${rel.fieldName?cap_first}Id()));
            entity.set${rel.fieldName?cap_first}(relEntity);
        } else {
            entity.set${rel.fieldName?cap_first}(null);
        }
            </#if>
        </#if>
        <#if rel.relationType == "MANY_TO_MANY">
            <#if rel.owner>
        if (dto.get${rel.fieldName?cap_first}Ids() != null && !dto.get${rel.fieldName?cap_first}Ids().isEmpty()) {
            List<${rel.targetType}> relEntities = ${rel.targetRepositoryName?uncap_first}.findAllById(dto.get${rel.fieldName?cap_first}Ids());
            entity.set${rel.fieldName?cap_first}(relEntities);
        } else {
            entity.set${rel.fieldName?cap_first}(new ArrayList<>());
        }
            </#if>
        </#if>
        <#if rel.relationType == "ONE_TO_MANY">
        if (dto.get${rel.fieldName?cap_first}Ids() != null && !dto.get${rel.fieldName?cap_first}Ids().isEmpty()) {
            List<${rel.targetType}> relEntities = ${rel.targetRepositoryName?uncap_first}.findAllById(dto.get${rel.fieldName?cap_first}Ids());
            for (${rel.targetType} child : relEntities) {
                child.set${rel.otherFieldName?cap_first}(entity);
            }
            entity.set${rel.fieldName?cap_first}(relEntities);
        } else {
            entity.set${rel.fieldName?cap_first}(new ArrayList<>());
        }
        </#if>
        </#list>
    }
}
