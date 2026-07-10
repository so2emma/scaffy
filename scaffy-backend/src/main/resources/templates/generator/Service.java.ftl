package ${basePackage}.service;

import ${basePackage}.dto.${name}RequestDto;
import ${basePackage}.dto.${name}ResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;

public interface ${name}Service {
    Page<${name}ResponseDto> getAll(Pageable pageable);
    ${name}ResponseDto getById(${primaryKeyType} id);
    ${name}ResponseDto create(${name}RequestDto dto);
    ${name}ResponseDto update(${primaryKeyType} id, ${name}RequestDto dto);
    void delete(${primaryKeyType} id);
}
