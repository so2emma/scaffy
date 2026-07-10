package ${basePackage}.controller;

import ${basePackage}.dto.${name}RequestDto;
import ${basePackage}.dto.${name}ResponseDto;
import ${basePackage}.service.${name}Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import jakarta.validation.Valid;

<#if openApiSupport?? && openApiSupport>
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
</#if>

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/${name?lower_case}s")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
<#if openApiSupport?? && openApiSupport>
@Tag(name = "${name}", description = "API endpoints for managing ${name} records")
</#if>
public class ${name}Controller {

    private final ${name}Service ${name?uncap_first}Service;

    @GetMapping
    <#if openApiSupport?? && openApiSupport>
    @Operation(summary = "Get all ${name} records with pagination", description = "Retrieve a paginated list of ${name} records")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved list")
    </#if>
    public ResponseEntity<Page<${name}ResponseDto>> getAll(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(${name?uncap_first}Service.getAll(pageable));
    }

    @GetMapping("/{id}")
    <#if openApiSupport?? && openApiSupport>
    @Operation(summary = "Get ${name} by ID", description = "Retrieve a single ${name} record by its primary key")
    @ApiResponse(responseCode = "200", description = "Found the record")
    @ApiResponse(responseCode = "404", description = "Record not found")
    </#if>
    public ResponseEntity<${name}ResponseDto> getById(@PathVariable ${primaryKeyType} id) {
        return ResponseEntity.ok(${name?uncap_first}Service.getById(id));
    }

    @PostMapping
    <#if openApiSupport?? && openApiSupport>
    @Operation(summary = "Create a new ${name}", description = "Save a new ${name} record based on payload validation")
    @ApiResponse(responseCode = "201", description = "Successfully created")
    @ApiResponse(responseCode = "400", description = "Invalid request payload")
    </#if>
    public ResponseEntity<${name}ResponseDto> create(@Valid @RequestBody ${name}RequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(${name?uncap_first}Service.create(dto));
    }

    @PutMapping("/{id}")
    <#if openApiSupport?? && openApiSupport>
    @Operation(summary = "Update an existing ${name}", description = "Update attributes of a ${name} record by ID")
    @ApiResponse(responseCode = "200", description = "Successfully updated")
    @ApiResponse(responseCode = "400", description = "Invalid payload or ID mismatch")
    @ApiResponse(responseCode = "404", description = "Record not found")
    </#if>
    public ResponseEntity<${name}ResponseDto> update(@PathVariable ${primaryKeyType} id, @Valid @RequestBody ${name}RequestDto dto) {
        return ResponseEntity.ok(${name?uncap_first}Service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    <#if openApiSupport?? && openApiSupport>
    @Operation(summary = "Delete ${name} by ID", description = "Remove (or soft-delete if enabled) a ${name} record by ID")
    @ApiResponse(responseCode = "204", description = "Successfully deleted")
    @ApiResponse(responseCode = "404", description = "Record not found")
    </#if>
    public ResponseEntity<Void> delete(@PathVariable ${primaryKeyType} id) {
        ${name?uncap_first}Service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
