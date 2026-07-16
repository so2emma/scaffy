import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
<#list preparedEntities as entity>
import { ${entity.name}Module } from './${entity.entityFolder}/${entity.entityFolder}.module';
</#list>
<#list preparedEntities as entity>
import { ${entity.name} } from './${entity.entityFolder}/entities/${entity.entityFolder}.entity';
</#list>

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || '${projectName?lower_case?replace(" ", "_")}',
      entities: [<#list preparedEntities as entity>${entity.name}<#if entity?has_next>, </#if></#list>],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
<#list preparedEntities as entity>
    ${entity.name}Module,
</#list>
  ],
})
export class AppModule {}
