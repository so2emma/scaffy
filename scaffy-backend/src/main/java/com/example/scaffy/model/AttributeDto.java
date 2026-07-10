package com.example.scaffy.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttributeDto {
    private String name;
    private String type; // String, Integer, Long, UUID, Boolean, LocalDate, LocalDateTime, BigDecimal, Enum
    private List<String> enumValues; // Optional: enum values if type is Enum
    private boolean primaryKey;
    private boolean nullable;
    private boolean unique;
    private String defaultValue;
    private ValidationConfigDto validation;

    // Manual constructor for backward compatibility in tests
    public AttributeDto(String name, String type, List<String> enumValues, boolean primaryKey, boolean nullable, boolean unique, String defaultValue) {
        this.name = name;
        this.type = type;
        this.enumValues = enumValues;
        this.primaryKey = primaryKey;
        this.nullable = nullable;
        this.unique = unique;
        this.defaultValue = defaultValue;
        this.validation = null;
    }
}
