package ${basePackage}.mapper;

import ${basePackage}.entity.${name};
import ${basePackage}.dto.${name}RequestDto;
import ${basePackage}.dto.${name}ResponseDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import java.util.List;

@Mapper(componentModel = "spring")
public interface ${name}Mapper {

    @Mapping(target = "${primaryKeyName}", ignore = true)
    <#list relations as rel>
    @Mapping(target = "${rel.fieldName}", ignore = true)
    </#list>
    ${name} toEntity(${name}RequestDto dto);

    ${name}ResponseDto toDto(${name} entity);
    
    List<${name}ResponseDto> toDtoList(List<${name}> entities);

    @Mapping(target = "${primaryKeyName}", ignore = true)
    <#list relations as rel>
    @Mapping(target = "${rel.fieldName}", ignore = true)
    </#list>
    void updateEntityFromDto(${name}RequestDto dto, @MappingTarget ${name} entity);
}
