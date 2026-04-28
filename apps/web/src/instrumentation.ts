/**
 * Next.js instrumentation hook. Runs once per Node worker on boot.
 * We register a SIGTERM handler so PM2 graceful reload (`pm2 reload`)
 * actually drains DB connections instead of leaking them.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { disconnectPrisma } = await import('@jbaybff/prisma');

  const onShutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[web] received ${signal}, draining...`);
    await disconnectPrisma().catch(() => {});
    process.exit(0);
  };

  process.once('SIGTERM', () => void onShutdown('SIGTERM'));
  process.once('SIGINT', () => void onShutdown('SIGINT'));
}
