spring.application.name=${projectName?lower_case}

# In-memory H2 database configuration
spring.datasource.url=jdbc:h2:mem:${projectName?lower_case}_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# JPA and Hibernate configuration
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
<#if flywayMigration?? && flywayMigration>
spring.jpa.hibernate.ddl-auto=validate
<#else>
spring.jpa.hibernate.ddl-auto=update
</#if>
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# Flyway configuration
spring.flyway.enabled=<#if flywayMigration?? && flywayMigration>true<#else>false</#if>
spring.flyway.baseline-on-migrate=true
