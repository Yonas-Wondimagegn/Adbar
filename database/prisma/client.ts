// database/prisma/client.ts
// Adbar (አድባር) — Prisma Client Configuration
// Version: 1.0.0
// Date: 2026-06-21
//
// Usage:
//   import { prisma } from '../database/prisma/client';
//
// For serverless environments, import from './client-serverless' instead.

import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
