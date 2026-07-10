package com.example.scaffy.service;

import com.example.scaffy.model.*;
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

public class ValidationServiceTest {

    private final ValidationService validationService = new ValidationService();

    @Test
    public void testValidDiagram() {
        DiagramDto diagram = new DiagramDto();
        diagram.setProjectName("MyProject");
        diagram.setBasePackage("com.example.myproject");

        List<EntityDto> entities = new ArrayList<>();
        EntityDto customer = new EntityDto("Customer", "customers", List.of(
                new AttributeDto("id", "Long", null, true, false, true, null),
                new AttributeDto("name", "String", null, false, false, false, null)
        ));
        EntityDto order = new EntityDto("Order", "orders", List.of(
                new AttributeDto("id", "Long", null, true, false, true, null),
                new AttributeDto("orderDate", "LocalDateTime", null, false, false, false, null)
        ));
        entities.add(customer);
        entities.add(order);
        diagram.setEntities(entities);

        List<RelationshipDto> relationships = new ArrayList<>();
        relationships.add(new RelationshipDto(
                "Customer", "Order", "ONE_TO_MANY", "orders", "customer",
                true, false, List.of("PERSIST"), null
        ));
        diagram.setRelationships(relationships);

        List<ValidationErrorDto> errors = validationService.validate(diagram);
        assertTrue(errors.isEmpty(), "Valid diagram should have no errors: " + errors);
    }

    @Test
    public void testDuplicateEntities() {
        DiagramDto diagram = new DiagramDto("MyProject", "com.example.myproject", List.of(
                new EntityDto("Customer", "customers", List.of(new AttributeDto("id", "Long", null, true, false, true, null))),
                new EntityDto("customer", "customers_dup", List.of(new AttributeDto("id", "Long", null, true, false, true, null)))
        ), new ArrayList<>());

        List<ValidationErrorDto> errors = validationService.validate(diagram);
        boolean hasDuplicateError = errors.stream().anyMatch(e -> e.getMessage().contains("Duplicate entity name"));
        assertTrue(hasDuplicateError, "Should detect duplicate entities");
    }

    @Test
    public void testMissingPrimaryKey() {
        DiagramDto diagram = new DiagramDto("MyProject", "com.example.myproject", List.of(
                new EntityDto("Customer", "customers", List.of(new AttributeDto("name", "String", null, false, false, false, null)))
        ), new ArrayList<>());

        List<ValidationErrorDto> errors = validationService.validate(diagram);
        boolean hasPkError = errors.stream().anyMatch(e -> e.getMessage().contains("Missing primary key"));
        assertTrue(hasPkError, "Should detect missing primary key");
    }

    @Test
    public void testInvalidTypeName() {
        DiagramDto diagram = new DiagramDto("MyProject", "com.example.myproject", List.of(
                new EntityDto("Customer", "customers", List.of(
                        new AttributeDto("id", "Long", null, true, false, true, null),
                        new AttributeDto("age", "Int", null, false, false, false, null) // Int is invalid (Integer is allowed)
                ))
        ), new ArrayList<>());

        List<ValidationErrorDto> errors = validationService.validate(diagram);
        boolean hasTypeError = errors.stream().anyMatch(e -> e.getMessage().contains("Invalid type"));
        assertTrue(hasTypeError, "Should detect invalid attribute type 'Int'");
    }

    @Test
    public void testDanglingRelationship() {
        DiagramDto diagram = new DiagramDto();
        diagram.setProjectName("MyProject");
        diagram.setBasePackage("com.example.myproject");

        List<EntityDto> entities = new ArrayList<>();
        entities.add(new EntityDto("Customer", "customers", List.of(new AttributeDto("id", "Long", null, true, false, true, null))));
        diagram.setEntities(entities);

        List<RelationshipDto> relationships = new ArrayList<>();
        relationships.add(new RelationshipDto(
                "Customer", "NonExistentEntity", "ONE_TO_MANY", "items", "customer",
                true, true, List.of("PERSIST"), null
        ));
        diagram.setRelationships(relationships);

        List<ValidationErrorDto> errors = validationService.validate(diagram);
        boolean hasDanglingError = errors.stream().anyMatch(e -> e.getMessage().contains("does not exist"));
        assertTrue(hasDanglingError, "Should detect dangling relationships");
    }

    @Test
    public void testCircularMandatoryRelationships() {
        DiagramDto diagram = new DiagramDto();
        diagram.setProjectName("MyProject");
        diagram.setBasePackage("com.example.myproject");

        List<EntityDto> entities = new ArrayList<>();
        entities.add(new EntityDto("A", "a_table", List.of(new AttributeDto("id", "Long", null, true, false, true, null))));
        entities.add(new EntityDto("B", "b_table", List.of(new AttributeDto("id", "Long", null, true, false, true, null))));
        diagram.setEntities(entities);

        // A has mandatory link to B (A -> B is mandatory)
        // B has mandatory link to A (B -> A is mandatory)
        List<RelationshipDto> relationships = new ArrayList<>();
        relationships.add(new RelationshipDto(
                "A", "B", "ONE_TO_ONE", "b", "a",
                false, false, List.of("PERSIST"), null // fromNullable = false, toNullable = false
        ));
        diagram.setRelationships(relationships);

        List<ValidationErrorDto> errors = validationService.validate(diagram);
        boolean hasCircularError = errors.stream().anyMatch(e -> e.getMessage().contains("Circular mandatory relationship cycle detected"));
        assertTrue(hasCircularError, "Should detect circular mandatory relationship: " + errors);
    }
}
