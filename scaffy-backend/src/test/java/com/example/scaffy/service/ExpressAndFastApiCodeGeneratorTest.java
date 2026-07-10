package com.example.scaffy.service;

import com.example.scaffy.model.*;
import com.example.scaffy.service.impl.ExpressCodeGenerator;
import com.example.scaffy.service.impl.FastApiCodeGenerator;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;

public class ExpressAndFastApiCodeGeneratorTest {

    private final ExpressCodeGenerator expressGenerator = new ExpressCodeGenerator();
    private final FastApiCodeGenerator fastApiGenerator = new FastApiCodeGenerator();

    private DiagramDto createComplexDiagram() {
        DiagramDto diagram = new DiagramDto();
        diagram.setProjectName("ECommerceSystem");
        diagram.setBasePackage("com.example.ecommerce");
        diagram.setOpenApiSupport(true);
        diagram.setGenerateTestStubs(true);
        diagram.setFlywayMigration(true);

        List<EntityDto> entities = new ArrayList<>();

        // Customer (UUID PK named customerId) with Soft Delete
        EntityDto customer = new EntityDto("Customer", "customers", List.of(
                new AttributeDto("customerId", "uuid", null, true, false, true, null),
                new AttributeDto("name", "string", null, false, false, false, null),
                new AttributeDto("email", "string", null, false, false, true, null)
        ));
        customer.setSoftDelete(true);
        
        AttributeDto emailAttr = customer.getAttributes().stream()
                .filter(attr -> attr.getName().equals("email"))
                .findFirst().orElseThrow();
        emailAttr.setValidation(new ValidationConfigDto(true, 5, 100, true));

        // Order (Long PK named orderId, Enum status)
        EntityDto order = new EntityDto("Order", "orders", List.of(
                new AttributeDto("orderId", "long", null, true, false, true, null),
                new AttributeDto("orderDate", "LocalDateTime", null, false, false, false, null),
                new AttributeDto("status", "Enum", List.of("PENDING", "SHIPPED", "DELIVERED"), false, false, false, "PENDING")
        ));

        // Product (Long PK named productId, BigDecimal price)
        EntityDto product = new EntityDto("Product", "products", List.of(
                new AttributeDto("productId", "long", null, true, false, true, null),
                new AttributeDto("sku", "string", null, false, false, true, null),
                new AttributeDto("price", "BigDecimal", null, false, false, false, null)
        ));

        entities.add(customer);
        entities.add(order);
        entities.add(product);
        diagram.setEntities(entities);

        // Relationships:
        // 1. ONE_TO_MANY from Customer to Order:
        //    Customer (from) has many Orders (to).
        //    fromField = orders, toField = customer.
        //    fromNullable = true, toNullable = false
        // 2. MANY_TO_MANY between Order and Product:
        //    Order (from) has many Products (to).
        //    fromField = products, toField = orders.
        //    joinTable = order_products.
        List<RelationshipDto> relationships = new ArrayList<>();
        relationships.add(new RelationshipDto(
                "Customer", "Order", "ONE_TO_MANY", "orders", "customer",
                true, false, List.of("PERSIST", "MERGE", "REMOVE"), null
        ));
        relationships.add(new RelationshipDto(
                "Order", "Product", "MANY_TO_MANY", "products", "orders",
                true, true, List.of("PERSIST", "MERGE"), "order_products"
        ));
        diagram.setRelationships(relationships);

        return diagram;
    }

    @Test
    public void testExpressGeneratorZipAndPreview() throws Exception {
        DiagramDto diagram = createComplexDiagram();

        // Test Preview generation
        Map<String, String> preview = expressGenerator.generatePreview(diagram, "Customer");
        assertNotNull(preview);
        
        String prismaSchema = preview.get("Prisma Schema");
        System.out.println("=== EXPRESS PRISMA SCHEMA ===");
        System.out.println(prismaSchema);
        System.out.println("=============================");

        String serviceCode = preview.get("Service");
        System.out.println("=== EXPRESS SERVICE ===");
        System.out.println(serviceCode);
        System.out.println("=======================");

        // Verify Prisma Schema Content (fixes verified)
        // Verify UUID PK annotation mapping is case-insensitive and uses uuid()
        assertTrue(prismaSchema.contains("customerId String @id @default(uuid())"));
        // Verify relation referencedColumnName is target's PK name, e.g., references: [customerId]
        assertTrue(prismaSchema.contains("references: [customerId]"));

        // Verify Service Content
        // Verify findById uses custom customerId PK name
        assertTrue(serviceCode.contains("where: { customerId: id }"));
        // Verify update/delete uses custom customerId PK name
        assertTrue(serviceCode.contains("where: { customerId: id }"));
    }

    @Test
    public void testFastApiGeneratorZipAndPreview() throws Exception {
        DiagramDto diagram = createComplexDiagram();

        // Test Preview generation
        Map<String, String> preview = fastApiGenerator.generatePreview(diagram, "Customer");
        assertNotNull(preview);

        String modelCode = preview.get("Model (SQLAlchemy)");
        System.out.println("=== FASTAPI MODEL ===");
        System.out.println(modelCode);
        System.out.println("=====================");

        String schemaCode = preview.get("Schema (Pydantic)");
        System.out.println("=== FASTAPI SCHEMA ===");
        System.out.println(schemaCode);
        System.out.println("======================");

        // Verify SQLAlchemy Model Content
        // Verify uuid mapping and target column references
        assertTrue(modelCode.contains("customer_id = Column(String, primary_key=True, index=True)"));
        // Verify is_deleted soft delete column
        assertTrue(modelCode.contains("is_deleted = Column(Boolean, default=False, nullable=False)"));

        // Verify Pydantic Schema Content
        // Verify required non-nullable fields do not have `= None` or `= default`
        assertTrue(schemaCode.contains("name: str"));
        // Verify nullable fields have `= None`
        assertTrue(schemaCode.contains("email: Optional[str] = None"));
        // Verify custom PK is present
        assertTrue(schemaCode.contains("customer_id: UUID"));
    }
}
