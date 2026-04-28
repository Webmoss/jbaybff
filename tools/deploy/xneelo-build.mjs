#!/usr/bin/env node
/**
 * xneelo-build.mjs
 *
 * Produces a self-contained deploy artifact for Xneelo:
 *
 *   1. Verifies node + pnpm versions.
 *   2. Generates the Prisma client.
 *   3. Builds both Next.js apps in standalone mode.
 *   4. Copies the standalone output + static assets + workspace public dirs
 *      into `.xneelo-build/` with the exact layout PM2 expects.
 *   5. Writes a build manifest (commit SHA, timestamp).
 *   6. (Optional) Tarballs the directory for SCP/rsync upload.
 *
 * Run from the workspace root:
 *   node tools/deploy/xneelo-build.mjs
 *   node tools/deploy/xneelo-build.mjs --tar     # also produce .tar.gz
 *   node tools/deploy/xneelo-build.mjs --skip-build  # only repack
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, '.xneelo-build');

const args = new Set(process.argv.slice(2));
const SHOULD_TAR = args.has('--tar');
const SKIP_BUILD = args.has('--skip-build');

const log = (msg) => console.log(`\u001b[36m▸\u001b[0m ${msg}`);
const ok = (msg) => console.log(`\u001b[32m✓\u001b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\u001b[31m✗\u001b[0m ${msg}`);
  process.exit(1);
};

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, {
    cwd: opts.cwd || ROOT,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...(opts.env || {}) },
  });
  if (result.status !== 0) fail(`Command failed: ${cmd}`);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
}

function gitCommit() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
  } catch {
    return null;
  }
}

(async () => {
  log('Verifying toolchain...');
  run('node --version');
  run('pnpm --version');

  if (!SKIP_BUILD) {
    log('Cleaning previous artifact...');
    fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true });

    log('Installing deps (frozen lockfile)...');
    run('pnpm install --frozen-lockfile');

    log('Generating Prisma client...');
    run('pnpm prisma:generate');

    log('Building apps in standalone mode...');
    run('pnpm exec nx run-many -t build --projects=@jbaybff/web,@jbaybff/admin', {
      env: {
        BUILD_TIMESTAMP: new Date().toISOString(),
        GIT_COMMIT_SHA: gitCommit() ?? '',
      },
    });
  }

  log('Assembling deploy artifact...');
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  for (const app of ['web', 'admin']) {
    const appOut = path.join(ARTIFACT_DIR, 'apps', app);
    fs.mkdirSync(appOut, { recursive: true });

    const standalone = path.join(ROOT, 'apps', app, '.next', 'standalone');
    const staticDir = path.join(ROOT, 'apps', app, '.next', 'static');
    const publicDir = path.join(ROOT, 'apps', app, 'public');

    if (!fs.existsSync(standalone)) {
      fail(
        `Missing standalone build for ${app}. Did the Next build succeed? ` +
          `Look in apps/${app}/.next/standalone.`,
      );
    }

    log(`  • copying standalone server for ${app}`);
    copyRecursive(standalone, appOut);

    log(`  • copying static assets for ${app}`);
    copyRecursive(staticDir, path.join(appOut, 'apps', app, '.next', 'static'));

    log(`  • copying public dir for ${app}`);
    copyRecursive(publicDir, path.join(appOut, 'apps', app, 'public'));
  }

  log('Copying ecosystem + Prisma assets...');
  copyRecursive(path.join(ROOT, 'ecosystem.config.cjs'), path.join(ARTIFACT_DIR, 'ecosystem.config.cjs'));
  copyRecursive(
    path.join(ROOT, 'libs/prisma/prisma'),
    path.join(ARTIFACT_DIR, 'libs/prisma/prisma'),
  );
  copyRecursive(
    path.join(ROOT, 'libs/prisma/package.json'),
    path.join(ARTIFACT_DIR, 'libs/prisma/package.json'),
  );

  log('Writing manifest...');
  const manifest = {
    builtAt: new Date().toISOString(),
    commit: gitCommit(),
    node: process.version,
    apps: ['web', 'admin'],
  };
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'BUILD_MANIFEST.json'),
    JSON.stringify(manifest, null, 2),
  );

  if (SHOULD_TAR) {
    const tarName = `deploy-artifact-${manifest.commit?.slice(0, 7) ?? 'unknown'}-${Date.now()}.tar.gz`;
    log(`Tarballing → ${tarName}`);
    run(`tar -czf ${tarName} -C .xneelo-build .`);
    ok(`Artifact ready at ${tarName}`);
  }

  ok('Deploy artifact built at .xneelo-build/');
  console.log(
    [
      '',
      'Next steps:',
      '  1. Upload .xneelo-build/ (or the tarball) to your Xneelo box.',
      '  2. Place .env.production alongside ecosystem.config.cjs.',
      '  3. From that directory: pm2 start ecosystem.config.cjs --env production',
      '  4. pm2 save && pm2 startup',
      '',
    ].join('\n'),
  );
})();
