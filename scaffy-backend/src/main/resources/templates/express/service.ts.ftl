import prisma from '../config/database';

<#assign isNumericId = (primaryKeyType == "Long" || primaryKeyType == "Integer" || primaryKeyType == "Int")>

<#list enums as enum>
export enum ${enum.enumClassName} {
  <#list enum.values as val>
  ${val} = "${val}",
  </#list>
}
</#list>

export class ${name}Service {
  async create(data: any) {
    return prisma.${name?uncap_first}.create({
      data,
    });
  }

  async findAll(page?: number, limit?: number) {
    const where = <#if softDelete>{ deleted: false }<#else>{}</#if>;
    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        prisma.${name?uncap_first}.findMany({
          where,
          skip,
          take: limit,
        }),
        prisma.${name?uncap_first}.count({ where }),
      ]);
      return { items, total, page, limit };
    }
    return prisma.${name?uncap_first}.findMany({ where });
  }

  async findById(id: <#if isNumericId>number<#else>string</#if>) {
    const record = await prisma.${name?uncap_first}.findUnique({
      where: { id },
    });
    <#if softDelete>
    if (!record || record.deleted) return null;
    </#if>
    return record;
  }

  async update(id: <#if isNumericId>number<#else>string</#if>, data: any) {
    return prisma.${name?uncap_first}.update({
      where: { id },
      data,
    });
  }

  async delete(id: <#if isNumericId>number<#else>string</#if>) {
    <#if softDelete>
    return prisma.${name?uncap_first}.update({
      where: { id },
      data: { deleted: true },
    });
    <#else>
    return prisma.${name?uncap_first}.delete({
      where: { id },
    });
    </#if>
  }
}
