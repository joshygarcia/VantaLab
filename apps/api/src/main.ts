import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import helmet from 'helmet';

async function bootstrap() {
  const express = require('express');
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use('/api/v1/billing/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT ?? '25mb' }));

  // Security Headers
  app.use(helmet());

  // Strict CORS policy
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`Persona API listening on http://localhost:${port}`);
}

bootstrap();
