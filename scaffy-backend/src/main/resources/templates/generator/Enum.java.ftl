package ${basePackage}.entity;

public enum ${enumClassName} {
    <#list values as val>
    ${val}<#if val_has_next>, </#if>
    </#list>
}
