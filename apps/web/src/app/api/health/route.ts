import { NextResponse } from 'next/server';

/**
 * Liveness probe for Xneelo / PM2 / uptime monitors.
 * Reports the running app, build identifier (if injected at build time), and
 * environment so the admin team can verify a deploy at a glance.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    app: 'web',
    status: 'ok',
    env: process.env.APP_ENV ?? 'unknown',
    commit: process.env.GIT_COMMIT_SHA ?? null,
    builtAt: process.env.BUILD_TIMESTAMP ?? null,
    now: new Date().toISOString(),
  });
}
