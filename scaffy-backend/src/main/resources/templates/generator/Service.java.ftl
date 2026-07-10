package ${basePackage}.service;

import ${basePackage}.dto.${name}RequestDto;
import ${basePackage}.dto.${name}ResponseDto;
import java.util.List;
import java.util.UUID;

public interface ${name}Service {
    List<${name}ResponseDto> getAll();
    ${name}ResponseDto getById(${primaryKeyType} id);
    ${name}ResponseDto create(${name}RequestDto dto);
    ${name}ResponseDto update(${primaryKeyType} id, ${name}RequestDto dto);
    void delete(${primaryKeyType} id);
}
