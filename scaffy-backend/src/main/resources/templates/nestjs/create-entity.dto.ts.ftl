import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, IsDate, IsEnum, IsUUID<#if openApiSupport>, ApiProperty</#if> } from 'class-validator';
<#if openApiSupport>
import { ApiPropertyOptional } from '@nestjs/swagger';
</#if>

export class Create${name}Dto {
<#list dtoAttributes as attr>
<#if openApiSupport>
<#if attr.nullable>
  @ApiPropertyOptional()
<#else>
  @ApiProperty()
</#if>
</#if>
<#list attr.validators as v>
  ${v}
</#list>
  ${attr.name}<#if attr.nullable>?</#if>: ${attr.tsType};

</#list>
}
