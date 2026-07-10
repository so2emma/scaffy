package com.example.scaffy.service;

import com.example.scaffy.model.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.*;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.*;

public class CodeGeneratorServiceTest {

    private final CodeGeneratorService codeGeneratorService = new CodeGeneratorService();

    @Test
    public void testGeneratedProjectCompiles(@TempDir Path tempDir) throws Exception {
        // Construct the 2-entity, 1-relationship test diagram
        DiagramDto diagram = new DiagramDto();
        diagram.setProjectName("LibrarySystem");
        diagram.setBasePackage("com.example.library");

        List<EntityDto> entities = new ArrayList<>();

        // Author
        EntityDto author = new EntityDto("Author", "authors", List.of(
                new AttributeDto("id", "Long", null, true, false, true, null),
                new AttributeDto("name", "String", null, false, false, false, null)
        ));

        // Book
        EntityDto book = new EntityDto("Book", "books", List.of(
                new AttributeDto("id", "Long", null, true, false, true, null),
                new AttributeDto("title", "String", null, false, false, false, null)
        ));

        entities.add(author);
        entities.add(book);
        diagram.setEntities(entities);

        // Relationship: MANY_TO_ONE from Book to Author
        // Book (from) -> Author (to), type MANY_TO_ONE.
        // fromField (in Book) = author, toField (in Author) = books.
        List<RelationshipDto> relationships = new ArrayList<>();
        relationships.add(new RelationshipDto(
                "Book", "Author", "MANY_TO_ONE", "author", "books",
                false, true, List.of("PERSIST", "MERGE"), null // Book.author is non-nullable (mandatory)
        ));
        diagram.setRelationships(relationships);

        // Generate the project
        byte[] zipBytes = codeGeneratorService.generateZip(diagram);
        assertNotNull(zipBytes);
        assertTrue(zipBytes.length > 0);

        // Unzip it to the temp directory
        unzip(zipBytes, tempDir);

        // Path to the project root inside the temp directory
        Path projectRoot = tempDir.resolve("library_system");
        assertTrue(Files.exists(projectRoot), "Project folder 'library_system' should exist");
        assertTrue(Files.exists(projectRoot.resolve("pom.xml")), "pom.xml should exist in project folder");

        // Run Maven compile on the generated project
        System.out.println("Running 'mvn clean compile' on generated project in: " + projectRoot);
        
        ProcessBuilder pb = new ProcessBuilder("mvn", "clean", "compile");
        pb.directory(projectRoot.toFile());
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Print maven output to console for debugging
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[Maven generated-compile]: " + line);
            }
        }

        boolean finished = process.waitFor(60, TimeUnit.SECONDS);
        assertTrue(finished, "Maven build timed out");
        assertEquals(0, process.exitValue(), "Maven compilation failed for generated project!");
    }

    @Test
    public void testComplexProjectCompiles(@TempDir Path tempDir) throws Exception {
        DiagramDto diagram = new DiagramDto();
        diagram.setProjectName("SalesSystem");
        diagram.setBasePackage("com.example.sales");

        List<EntityDto> entities = new ArrayList<>();

        // Customer (UUID PK)
        EntityDto customer = new EntityDto("Customer", "customers", List.of(
                new AttributeDto("id", "UUID", null, true, false, true, null),
                new AttributeDto("name", "String", null, false, false, false, null),
                new AttributeDto("email", "String", null, false, false, true, null)
        ));

        // Order (Long PK, Enum status)
        EntityDto order = new EntityDto("Order", "orders", List.of(
                new AttributeDto("id", "Long", null, true, false, true, null),
                new AttributeDto("orderDate", "LocalDateTime", null, false, false, false, null),
                new AttributeDto("status", "Enum", List.of("PENDING", "SHIPPED", "DELIVERED"), false, false, false, "PENDING")
        ));

        // Product (Long PK, BigDecimal price)
        EntityDto product = new EntityDto("Product", "products", List.of(
                new AttributeDto("id", "Long", null, true, false, true, null),
                new AttributeDto("sku", "String", null, false, false, true, null),
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
        //    fromNullable = true, toNullable = false (Order must have a Customer).
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

        // Generate the project
        byte[] zipBytes = codeGeneratorService.generateZip(diagram);
        assertNotNull(zipBytes);
        assertTrue(zipBytes.length > 0);

        // Unzip it to the temp directory
        unzip(zipBytes, tempDir);

        // Path to the project root inside the temp directory
        Path projectRoot = tempDir.resolve("sales_system");
        assertTrue(Files.exists(projectRoot), "Project folder 'sales_system' should exist");
        assertTrue(Files.exists(projectRoot.resolve("pom.xml")), "pom.xml should exist in project folder");

        // Run Maven compile on the generated project
        System.out.println("Running 'mvn clean compile' on generated project in: " + projectRoot);
        
        ProcessBuilder pb = new ProcessBuilder("mvn", "clean", "compile");
        pb.directory(projectRoot.toFile());
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Print maven output to console for debugging
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[Maven complex-compile]: " + line);
            }
        }

        boolean finished = process.waitFor(90, TimeUnit.SECONDS);
        assertTrue(finished, "Maven build timed out");
        assertEquals(0, process.exitValue(), "Maven compilation failed for complex generated project!");
    }

    private void unzip(byte[] zipBytes, Path destDir) throws IOException {
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                Path filePath = destDir.resolve(entry.getName());
                if (entry.isDirectory()) {
                    Files.createDirectories(filePath);
                } else {
                    Files.createDirectories(filePath.getParent());
                    Files.copy(zis, filePath, StandardCopyOption.REPLACE_EXISTING);
                }
                zis.closeEntry();
            }
        }
    }
}
