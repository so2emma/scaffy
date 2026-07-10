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
}
