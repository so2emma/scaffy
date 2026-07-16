import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${name} } from './entities/${entityFolder}.entity';
import { ${name}Service } from './${entityFolder}.service';
import { ${name}Controller } from './${entityFolder}.controller';

@Module({
  imports: [TypeOrmModule.forFeature([${name}])],
  controllers: [${name}Controller],
  providers: [${name}Service],
  exports: [${name}Service],
})
export class ${name}Module {}
