import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const isProduction =
    configService.get<string>('NODE_ENV', 'development') === 'production';

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  expressApp.disable('x-powered-by');
  app.enableShutdownHooks();

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:5173',
  );
  const corsOrigins =
    corsOrigin === '*'
      ? true
      : corsOrigin.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: corsOrigin !== '*',
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  if (!isProduction) {
    // Swagger documentation
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SkillSwap API')
      .setDescription('API for SkillSwap - Skill Exchange Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Start server
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`Application running on http://localhost:${port}`);
  if (!isProduction) {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
