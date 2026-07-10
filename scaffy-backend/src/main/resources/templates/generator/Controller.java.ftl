package ${basePackage}.controller;

import ${basePackage}.dto.${name}RequestDto;
import ${basePackage}.dto.${name}ResponseDto;
import ${basePackage}.service.${name}Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/${name?lower_case}s")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ${name}Controller {

    private final ${name}Service ${name?uncap_first}Service;

    @GetMapping
    public ResponseEntity<List<${name}ResponseDto>> getAll() {
        return ResponseEntity.ok(${name?uncap_first}Service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<${name}ResponseDto> getById(@PathVariable ${primaryKeyType} id) {
        return ResponseEntity.ok(${name?uncap_first}Service.getById(id));
    }

    @PostMapping
    public ResponseEntity<${name}ResponseDto> create(@Valid @RequestBody ${name}RequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(${name?uncap_first}Service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<${name}ResponseDto> update(@PathVariable ${primaryKeyType} id, @Valid @RequestBody ${name}RequestDto dto) {
        return ResponseEntity.ok(${name?uncap_first}Service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable ${primaryKeyType} id) {
        ${name?uncap_first}Service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
