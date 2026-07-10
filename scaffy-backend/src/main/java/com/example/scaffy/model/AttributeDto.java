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
}
