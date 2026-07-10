package com.example.scaffy.service;

import com.example.scaffy.model.AttributeDto;
import com.example.scaffy.model.DiagramDto;
import com.example.scaffy.model.EntityDto;
import com.example.scaffy.model.RelationshipDto;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class ReverseEngineeringServiceTest {

    @Autowired
    private ReverseEngineeringService reverseEngineeringService;

    @Test
    public void testParseDdlSuccess() {
        String ddl = """
            -- Author table
            CREATE TABLE authors (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE
            );
            
            -- Category table
            CREATE TABLE categories (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(50) NOT NULL,
                status ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') DEFAULT 'ACTIVE'
            );
            
            /* Book table */
            CREATE TABLE books (
                id BIGINT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                author_id BIGINT,
                deleted_at TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES authors(id)
            );
            
            -- Many to Many Join Table
            CREATE TABLE book_categories (
                book_id BIGINT NOT NULL,
                category_id BIGINT NOT NULL,
                PRIMARY KEY (book_id, category_id),
                FOREIGN KEY (book_id) REFERENCES books(id),
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );
            """;

        DiagramDto diagram = reverseEngineeringService.parseDdl(ddl);

        assertNotNull(diagram);
        // Authors, Categories and Books entities are present; book_categories is converted to a Many-to-Many relationship
        assertEquals(3, diagram.getEntities().size());
        
        EntityDto authorEntity = diagram.getEntities().stream()
                .filter(e -> e.getName().equals("Authors"))
                .findFirst()
                .orElse(null);
        assertNotNull(authorEntity);
        assertEquals("authors", authorEntity.getTableName());
        assertFalse(authorEntity.isSoftDelete());
        
        EntityDto bookEntity = diagram.getEntities().stream()
                .filter(e -> e.getName().equals("Books"))
                .findFirst()
                .orElse(null);
        assertNotNull(bookEntity);
        assertTrue(bookEntity.isSoftDelete()); // deleted_at marks it soft delete
        
        AttributeDto titleAttr = bookEntity.getAttributes().stream()
                .filter(a -> a.getName().equals("title"))
                .findFirst()
                .orElse(null);
        assertNotNull(titleAttr);
        assertEquals("String", titleAttr.getType());
        assertFalse(titleAttr.isNullable());
        assertNotNull(titleAttr.getValidation());
        assertTrue(titleAttr.getValidation().isRequired());
        assertEquals(255, titleAttr.getValidation().getMaxSize());

        // Assert SQL enum mapping
        EntityDto categoryEntity = diagram.getEntities().stream()
                .filter(e -> e.getName().equals("Categories"))
                .findFirst()
                .orElse(null);
        assertNotNull(categoryEntity);
        AttributeDto statusAttr = categoryEntity.getAttributes().stream()
                .filter(a -> a.getName().equals("status"))
                .findFirst()
                .orElse(null);
        assertNotNull(statusAttr);
        assertEquals("Enum", statusAttr.getType());
        assertEquals(Arrays.asList("ACTIVE", "INACTIVE", "ARCHIVED"), statusAttr.getEnumValues());

        // Relationships: Many-to-One and Many-to-Many
        assertEquals(2, diagram.getRelationships().size());

        RelationshipPool: {
            RelationshipDto manyToOne = diagram.getRelationships().stream()
                    .filter(r -> r.getType().equals("MANY_TO_ONE"))
                    .findFirst()
                    .orElse(null);
            assertNotNull(manyToOne);
            assertEquals("Books", manyToOne.getFrom());
            assertEquals("Authors", manyToOne.getTo());
            assertEquals("author", manyToOne.getFromField());
            assertEquals("books", manyToOne.getToField());

            RelationshipDto manyToMany = diagram.getRelationships().stream()
                    .filter(r -> r.getType().equals("MANY_TO_MANY"))
                    .findFirst()
                    .orElse(null);
            assertNotNull(manyToMany);
            assertEquals("Books", manyToMany.getFrom());
            assertEquals("Categories", manyToMany.getTo());
            assertEquals("categories", manyToMany.getFromField());
            assertEquals("books", manyToMany.getToField());
            assertEquals("book_categories", manyToMany.getJoinTable());
        }
    }

    @Test
    public void testScanSpringBootProjectSuccess() throws java.io.IOException {
        java.nio.file.Path tempDir = java.nio.file.Files.createTempDirectory("scaffy-test-project");
        java.nio.file.Path packageDir = tempDir.resolve("src/main/java/com/example/entity");
        java.nio.file.Files.createDirectories(packageDir);

        String javaClass = """
            package com.example.entity;
            
            import jakarta.persistence.*;
            import java.time.Instant;
            import java.math.BigDecimal;
            
            @Entity
            @Table(name = "items")
            public class Item {
                @Id
                @GeneratedValue(strategy = GenerationType.IDENTITY)
                private Long id;
                
                @Column(name = "name", nullable = false)
                private String name;
                
                @Column(name = "price")
                private BigDecimal price = BigDecimal.ZERO;
                
                @Column(name = "created_at", nullable = false, updatable = false)
                private java.time.Instant createdAt = java.time.Instant.now();
                
                @Enumerated(EnumType.STRING)
                private ItemStatus status;

                @ManyToOne
                @JoinColumn(name = "order_id")
                private Order order;
            }
            """;

        String orderClass = """
            package com.example.entity;
            
            import jakarta.persistence.*;
            import java.util.List;
            
            @Entity
            @Table(name = "orders")
            public class Order {
                @Id
                private Long id;
                
                @OneToMany(mappedBy = "order")
                private List<Item> items;
            }
            """;

        String statusEnumClass = """
            package com.example.entity;
            
            public enum ItemStatus {
                DRAFT,
                PUBLISHED,
                ARCHIVED
            }
            """;

        java.nio.file.Files.writeString(packageDir.resolve("Item.java"), javaClass);
        java.nio.file.Files.writeString(packageDir.resolve("Order.java"), orderClass);
        java.nio.file.Files.writeString(packageDir.resolve("ItemStatus.java"), statusEnumClass);

        DiagramDto diagram = reverseEngineeringService.scanSpringBootProject(tempDir.toString());

        assertNotNull(diagram);
        assertEquals("com.example", diagram.getBasePackage());
        assertEquals(2, diagram.getEntities().size());

        EntityDto itemEntity = diagram.getEntities().stream()
                .filter(e -> e.getName().equals("Item"))
                .findFirst()
                .orElse(null);
        assertNotNull(itemEntity);
        assertEquals("items", itemEntity.getTableName());

        // Validate attribute parsing with default assignments and LocalDateTime mapping
        AttributeDto priceAttr = itemEntity.getAttributes().stream()
                .filter(a -> a.getName().equals("price"))
                .findFirst()
                .orElse(null);
        assertNotNull(priceAttr);
        assertEquals("BigDecimal", priceAttr.getType());

        AttributeDto createdAtAttr = itemEntity.getAttributes().stream()
                .filter(a -> a.getName().equals("createdAt"))
                .findFirst()
                .orElse(null);
        assertNotNull(createdAtAttr);
        assertEquals("LocalDateTime", createdAtAttr.getType()); // Instant mapped to LocalDateTime
        assertFalse(createdAtAttr.isNullable());

        // Validate status enum mapping
        AttributeDto statusAttr = itemEntity.getAttributes().stream()
                .filter(a -> a.getName().equals("status"))
                .findFirst()
                .orElse(null);
        assertNotNull(statusAttr);
        assertEquals("Enum", statusAttr.getType());
        assertEquals(Arrays.asList("DRAFT", "PUBLISHED", "ARCHIVED"), statusAttr.getEnumValues());

        // Validate mapped relationship
        assertEquals(1, diagram.getRelationships().size());
        RelationshipDto rel = diagram.getRelationships().get(0);
        assertEquals("Item", rel.getFrom());
        assertEquals("Order", rel.getTo());
        assertEquals("MANY_TO_ONE", rel.getType());
        assertEquals("order", rel.getFromField());
        assertEquals("items", rel.getToField()); // bidirectionally linked via mappedBy

        // Clean up
        deleteDirectory(tempDir.toFile());
    }

    private void deleteDirectory(java.io.File file) {
        if (file.isDirectory()) {
            for (java.io.File sub : file.listFiles()) {
                deleteDirectory(sub);
            }
        }
        file.delete();
    }
}
