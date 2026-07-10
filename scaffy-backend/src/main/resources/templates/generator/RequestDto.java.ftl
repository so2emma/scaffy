package ${basePackage}.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import ${basePackage}.entity.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ${name}RequestDto {

    <#list attributes as attr>
    <#if !attr.primaryKey>
    <#if !attr.nullable>
    @NotNull(message = "${attr.name} is required")
    </#if>
    private <#if attr.type == "Enum">${name}${attr.name?cap_first}<#else>${attr.type}</#if> ${attr.name};

    </#if>
    </#list>
    <#list relations as rel>
    <#if rel.relationType == "ONE_TO_ONE" || rel.relationType == "MANY_TO_ONE">
    private ${rel.targetIdType} ${rel.fieldName}Id;
    </#if>
    <#if rel.relationType == "ONE_TO_MANY" || rel.relationType == "MANY_TO_MANY">
    private List<${rel.targetIdType}> ${rel.fieldName}Ids;
    </#if>
    </#list>
}
