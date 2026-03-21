import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';
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

  // Prevent oversized payload abuse.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Lightweight in-memory rate limiting to reduce brute-force and burst abuse.
  const requestWindows = new Map<string, { count: number; resetAt: number }>();
  app.use((req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = req.path || '';

    // Do not rate-limit Socket.IO transport requests; it causes reconnect loops and signaling drops.
    if (path.startsWith('/socket.io')) {
      return next();
    }

    const isAuthPath = path.startsWith('/api/auth');
    const windowMs = isAuthPath ? 10 * 60 * 1000 : 60 * 1000;
    const maxRequests = isAuthPath ? 30 : 300;
    const key = `${ip}:${isAuthPath ? 'auth' : 'global'}`;

    const existing = requestWindows.get(key);
    if (!existing || now > existing.resetAt) {
      requestWindows.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
      });
    }

    return next();
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:5173',
  );
  if (isProduction && corsOrigin === '*') {
    throw new Error('CORS_ORIGIN cannot be * in production');
  }
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
