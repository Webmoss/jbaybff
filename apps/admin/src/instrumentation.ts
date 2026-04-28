export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { disconnectPrisma } = await import('@jbaybff/prisma');

  const onShutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[admin] received ${signal}, draining...`);
    await disconnectPrisma().catch(() => {});
    process.exit(0);
  };

  process.once('SIGTERM', () => void onShutdown('SIGTERM'));
  process.once('SIGINT', () => void onShutdown('SIGINT'));
}
