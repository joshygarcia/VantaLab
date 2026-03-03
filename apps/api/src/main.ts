import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import helmet from 'helmet';
import { resolveAllowedOrigins } from './cors';

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

function assertRequiredEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Update apps/api/.env before starting the API.'
    );
  }
}

async function bootstrap() {
  assertRequiredEnvVars();
  const express = require('express');
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use('/api/v1/billing/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT ?? '25mb' }));

  // Security Headers
  app.use(helmet());

  // Strict CORS policy
  const allowedOrigins = resolveAllowedOrigins(process.env.FRONTEND_URL);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`Vanta Lab API listening on http://localhost:${port}`);
}

bootstrap();
