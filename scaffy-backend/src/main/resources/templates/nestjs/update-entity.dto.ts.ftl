import { PartialType } from '@nestjs/mapped-types';
<#if openApiSupport>
import { ApiPropertyOptional } from '@nestjs/swagger';
</#if>
import { Create${name}Dto } from './create-${entityFolder}.dto';

export class Update${name}Dto extends PartialType(Create${name}Dto) {}
