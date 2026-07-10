package com.example.scaffy.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiagramDto {
    private String projectName;
    private String basePackage;
    private List<EntityDto> entities;
    private List<RelationshipDto> relationships;
}
