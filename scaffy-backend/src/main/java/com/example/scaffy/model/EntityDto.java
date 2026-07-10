package com.example.scaffy.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntityDto {
    private String name;
    private String tableName; // optional override
    private List<AttributeDto> attributes;
    private boolean softDelete;

    // Manual constructor for backward compatibility in tests
    public EntityDto(String name, String tableName, List<AttributeDto> attributes) {
        this.name = name;
        this.tableName = tableName;
        this.attributes = attributes;
        this.softDelete = false;
    }
}
