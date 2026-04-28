import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    app: 'admin',
    status: 'ok',
    env: process.env.APP_ENV ?? 'unknown',
    commit: process.env.GIT_COMMIT_SHA ?? null,
    builtAt: process.env.BUILD_TIMESTAMP ?? null,
    now: new Date().toISOString(),
  });
}
