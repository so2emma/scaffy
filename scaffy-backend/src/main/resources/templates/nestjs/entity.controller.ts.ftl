import { Controller, Get, Post, Body, Put, Param, Delete, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
<#if openApiSupport>
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
</#if>
import { ${name}Service } from './${entityFolder}.service';
import { Create${name}Dto } from './dto/create-${entityFolder}.dto';
import { Update${name}Dto } from './dto/update-${entityFolder}.dto';

<#if openApiSupport>
@ApiTags('${pluralLowerName}')
</#if>
@Controller('${pluralLowerName}')
export class ${name}Controller {
  constructor(private readonly ${name?uncap_first}Service: ${name}Service) {}

<#if openApiSupport>
  @ApiOperation({ summary: 'Create a new ${name?uncap_first}' })
  @ApiResponse({ status: 201, description: 'The ${name?uncap_first} has been successfully created.' })
</#if>
  @Post()
  create(@Body() createDto: Create${name}Dto) {
    return this.${name?uncap_first}Service.create(createDto);
  }

<#if openApiSupport>
  @ApiOperation({ summary: 'Get all ${pluralLowerName}' })
  @ApiResponse({ status: 200, description: 'Return all ${pluralLowerName}.' })
</#if>
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.${name?uncap_first}Service.findAll(page, limit);
  }

<#if openApiSupport>
  @ApiOperation({ summary: 'Get a ${name?uncap_first} by id' })
  @ApiResponse({ status: 200, description: 'Return the ${name?uncap_first}.' })
  @ApiResponse({ status: 404, description: '${name} not found.' })
</#if>
  @Get(':id')
  findOne(@Param('id') id: ${idTsType}) {
    return this.${name?uncap_first}Service.findOne(<#if isNumericId>+id<#else>id</#if>);
  }

<#if openApiSupport>
  @ApiOperation({ summary: 'Update a ${name?uncap_first}' })
  @ApiResponse({ status: 200, description: 'The ${name?uncap_first} has been successfully updated.' })
</#if>
  @Put(':id')
  update(@Param('id') id: ${idTsType}, @Body() updateDto: Update${name}Dto) {
    return this.${name?uncap_first}Service.update(<#if isNumericId>+id<#else>id</#if>, updateDto);
  }

<#if openApiSupport>
  @ApiOperation({ summary: 'Delete a ${name?uncap_first}' })
  @ApiResponse({ status: 200, description: 'The ${name?uncap_first} has been successfully deleted.' })
</#if>
  @Delete(':id')
  remove(@Param('id') id: ${idTsType}) {
    return this.${name?uncap_first}Service.remove(<#if isNumericId>+id<#else>id</#if>);
  }
}
