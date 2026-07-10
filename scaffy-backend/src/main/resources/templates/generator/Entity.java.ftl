package ${basePackage}.entity;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import java.util.UUID;
<#if softDelete?? && softDelete>
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
</#if>

@Entity
@Table(name = "${tableName}")
<#if softDelete?? && softDelete>
<#list attributes as attr><#if attr.primaryKey><#assign pkCol = attr.columnName></#if></#list>
@SQLDelete(sql = "UPDATE ${tableName} SET deleted_at = CURRENT_TIMESTAMP WHERE ${pkCol!"id"} = ?")
@SQLRestriction("deleted_at IS NULL")
</#if>
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {<#list relationshipFields as f>"${f}"<#if f_has_next>, </#if></#list>})
@EqualsAndHashCode(exclude = {<#list relationshipFields as f>"${f}"<#if f_has_next>, </#if></#list>})
public class ${name} {

    <#list attributes as attr>
    <#if attr.primaryKey>
    @Id
    <#if attr.type == "Long" || attr.type == "Integer">
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    <#elseif attr.type == "UUID">
    @GeneratedValue(strategy = GenerationType.AUTO)
    </#if>
    </#if>
    <#if attr.type == "Enum">
    @Enumerated(EnumType.STRING)
    </#if>
    @Column(
        name = "${attr.columnName}"<#if !attr.nullable>, nullable = false</#if><#if attr.unique>, unique = true</#if><#if attr.validation?? && attr.validation.maxSize??>, length = ${attr.validation.maxSize}</#if>
    )
    private <#if attr.type == "Enum">${name}${attr.name?cap_first}<#else>${attr.type}</#if> ${attr.name};

    </#list>

    <#if softDelete?? && softDelete>
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    </#if>
    <#list relations as rel>
    <#if rel.relationType == "ONE_TO_ONE">
        <#if rel.owner>
    @OneToOne(cascade = {<#list rel.cascadeTypes as c>CascadeType.${c}<#if c_has_next>, </#if></#list>})
    @JoinColumn(name = "${rel.joinColumnName}", nullable = ${rel.nullable?c})
    private ${rel.targetType} ${rel.fieldName};
        <#else>
    @OneToOne(mappedBy = "${rel.mappedBy}")
    private ${rel.targetType} ${rel.fieldName};
        </#if>
    </#if>
    <#if rel.relationType == "ONE_TO_MANY">
    @OneToMany(mappedBy = "${rel.mappedBy}", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<${rel.targetType}> ${rel.fieldName} = new ArrayList<>();
    </#if>
    <#if rel.relationType == "MANY_TO_ONE">
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "${rel.joinColumnName}", nullable = ${rel.nullable?c})
    private ${rel.targetType} ${rel.fieldName};
    </#if>
    <#if rel.relationType == "MANY_TO_MANY">
        <#if rel.owner>
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "${rel.joinTableName}",
        joinColumns = @JoinColumn(name = "${rel.joinColumnName}"),
        inverseJoinColumns = @JoinColumn(name = "${rel.inverseJoinColumnName}")
    )
    @Builder.Default
    private List<${rel.targetType}> ${rel.fieldName} = new ArrayList<>();
        <#else>
    @ManyToMany(mappedBy = "${rel.mappedBy}")
    @Builder.Default
    private List<${rel.targetType}> ${rel.fieldName} = new ArrayList<>();
        </#if>
    </#if>

    </#list>
}
