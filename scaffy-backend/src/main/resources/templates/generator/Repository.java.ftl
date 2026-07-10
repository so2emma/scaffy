package ${basePackage}.repository;

import ${basePackage}.entity.${name};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface ${name}Repository extends JpaRepository<${name}, ${primaryKeyType}> {
}
