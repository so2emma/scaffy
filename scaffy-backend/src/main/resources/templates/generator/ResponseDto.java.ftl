package ${basePackage}.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
public class ${name}ResponseDto {

    <#list attributes as attr>
    private <#if attr.type == "Enum">${name}${attr.name?cap_first}<#else>${attr.type}</#if> ${attr.name};
    </#list>

    <#list relations as rel>
    <#if rel.relationType == "ONE_TO_ONE" || rel.relationType == "MANY_TO_ONE">
    <#if rel.otherFieldName??>
    @JsonIgnoreProperties("${rel.otherFieldName}")
    </#if>
    private ${rel.targetType}ResponseDto ${rel.fieldName};
    </#if>
    <#if rel.relationType == "ONE_TO_MANY" || rel.relationType == "MANY_TO_MANY">
    <#if rel.otherFieldName??>
    @JsonIgnoreProperties("${rel.otherFieldName}")
    </#if>
    private List<${rel.targetType}ResponseDto> ${rel.fieldName};
    </#if>
    </#list>
}
