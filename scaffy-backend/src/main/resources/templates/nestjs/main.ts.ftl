import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
<#if openApiSupport>
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
</#if>
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

<#if openApiSupport>
  const config = new DocumentBuilder()
    .setTitle('${projectName}')
    .setDescription('${projectName} API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

</#if>
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${'$'}{port}`);
}
bootstrap();
