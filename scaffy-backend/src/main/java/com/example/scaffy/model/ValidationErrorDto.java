package com.example.scaffy.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidationErrorDto {
    private String type; // SCHEMA, ENTITY, ATTRIBUTE, RELATIONSHIP
    private String target; // Entity name or relationship key
    private String property; // Name of the field/attribute that failed validation
    private String message; // The error message
}
