import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client.
 *
 * In dev, Next.js hot-reload would otherwise spawn many connections; we
 * stash the instance on `globalThis` to keep one process-wide client.
 *
 * On Xneelo (PM2 cluster mode) each Node worker gets its own instance —
 * which is the desired behaviour because `connection_limit` in the
 * `DATABASE_URL` query string controls the per-worker pool size.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isProd = process.env.NODE_ENV === 'production';

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
    errorFormat: isProd ? 'minimal' : 'pretty',
  });

if (!isProd) {
  globalForPrisma.prisma = prisma;
}

/**
 * Helper for graceful shutdown — wire into PM2 SIGTERM handlers and
 * Next.js `instrumentation.ts` if the worker terminates gracefully.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
