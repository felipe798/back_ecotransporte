import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
const PORT = process.env.PORT || 4002;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Main');

  app.enableCors();

  const swaggerOptions = new DocumentBuilder()
    .setTitle('Desima API')
    .setDescription('API documentation for Desima')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerOptions);

  SwaggerModule.setup(`/swagger`, app, swaggerDoc);

  // Validate query params and body
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set up static file serving
  app.use('/uploads', express.static('uploads'));

  await app.listen(PORT);
  // Log current url of app
  let baseUrl = app.getHttpServer().address().address;
  if (baseUrl === '0.0.0.0' || baseUrl === '::') {
    baseUrl = 'localhost';
  }
  logger.log(`Listening to http://${baseUrl}:${PORT}`);
  logger.log(`Swagger UI: http://${baseUrl}:${PORT}/swagger`);
}
bootstrap();
