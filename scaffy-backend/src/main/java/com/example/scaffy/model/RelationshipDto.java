package com.example.scaffy.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RelationshipDto {
    private String from;
    private String to;
    private String type; // ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE, MANY_TO_MANY
    private String fromField;
    private String toField; // optional for bidirectional, null/empty for unidirectional
    private Boolean fromNullable = true; // whether the relation is nullable on the 'from' side
    private Boolean toNullable = true; // whether the relation is nullable on the 'to' side
    private List<String> cascade; // PERSIST, MERGE, REMOVE
    private String joinTable; // only for MANY_TO_MANY
}
