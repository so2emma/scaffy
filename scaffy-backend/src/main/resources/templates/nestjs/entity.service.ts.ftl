import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${name} } from './entities/${entityFolder}.entity';
import { Create${name}Dto } from './dto/create-${entityFolder}.dto';
import { Update${name}Dto } from './dto/update-${entityFolder}.dto';

@Injectable()
export class ${name}Service {
  constructor(
    @InjectRepository(${name})
    private readonly ${name?uncap_first}Repository: Repository<${name}>,
  ) {}

  async create(createDto: Create${name}Dto): Promise<${name}> {
    const entity = this.${name?uncap_first}Repository.create(createDto);
    return this.${name?uncap_first}Repository.save(entity);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: ${name}[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.${name?uncap_first}Repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
<#if softDelete>
      where: { deletedAt: null },
</#if>
    });
    return { data, total, page, limit };
  }

  async findOne(${primaryKeyName}: ${idTsType}): Promise<${name}> {
    const entity = await this.${name?uncap_first}Repository.findOne({ where: { ${primaryKeyName} } as any });
    if (!entity) {
      throw new NotFoundException(`${name} with ${primaryKeyName} ${'$'}{${primaryKeyName}} not found`);
    }
    return entity;
  }

  async update(${primaryKeyName}: ${idTsType}, updateDto: Update${name}Dto): Promise<${name}> {
    const entity = await this.findOne(${primaryKeyName});
    Object.assign(entity, updateDto);
    return this.${name?uncap_first}Repository.save(entity);
  }

  async remove(${primaryKeyName}: ${idTsType}): Promise<void> {
<#if softDelete>
    await this.${name?uncap_first}Repository.softDelete(${primaryKeyName});
<#else>
    const entity = await this.findOne(${primaryKeyName});
    await this.${name?uncap_first}Repository.remove(entity);
</#if>
  }
}
