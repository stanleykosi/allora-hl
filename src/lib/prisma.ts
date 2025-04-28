/**
 * description
 * This module provides a singleton instance of the Prisma Client.
 * It ensures that only one instance of Prisma Client is created,
 * which is crucial in serverless environments and during development
 * with Next.js hot reloading to prevent exhausting database connections.
 *
 * dependencies
 * - @prisma/client: The Prisma Client library generated from the schema.
 *
 * notes
 * - In development (`NODE_ENV === 'development'`), it uses a global variable (`globalThis.prisma`)
 *   to store and reuse the Prisma Client instance across hot reloads.
 * - In production (`NODE_ENV !== 'development'`), it creates a new Prisma Client instance.
 * - This pattern is the recommended way to use Prisma Client with Next.js.
 *   See: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the Prisma Client instance in development.
// We use 'var' to ensure it's truly global, not block-scoped.
// Use '@ts-ignore' because TypeScript might complain about assigning to 'globalThis' without prior declaration.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma Client instance.
 *
 * In development, it checks if `globalThis.prisma` exists. If not, it creates a new
 * PrismaClient instance and assigns it to `globalThis.prisma`. It then returns this instance.
 *
 * In production, it always creates and returns a new PrismaClient instance.
 */
export const prisma: PrismaClient =
  globalThis.prisma || // Reuse existing instance in development if available
  new PrismaClient({
    // Optionally add logging configuration
    // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

// Assign the instance to the global variable in development environments.
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Export the singleton instance for use throughout the application.
export default prisma;

