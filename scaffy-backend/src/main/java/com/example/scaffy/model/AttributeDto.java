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
    private Boolean primaryKey; // Changed to Boolean wrapper to avoid default false
    private Boolean nullable; // Changed to Boolean wrapper
    private Boolean unique; // Changed to Boolean wrapper
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
    
    // Convenience methods that handle null safely
    public boolean isPrimaryKey() {
        return Boolean.TRUE.equals(primaryKey);
    }
    
    public boolean isNullable() {
        return !Boolean.FALSE.equals(nullable); // Default to true if null
    }
    
    public boolean isUnique() {
        return Boolean.TRUE.equals(unique);
    }
}
