/**
 * PM2 ecosystem for Xneelo deployment.
 *
 * Both Next.js apps run as long-lived Node processes behind whatever
 * reverse proxy the Xneelo box is fronted by (Apache via cPanel, LiteSpeed,
 * or Nginx on a dedicated/VPS plan).
 *
 * Key design choices:
 *   • `output: 'standalone'` in each `next.config.mjs` produces a self-
 *     contained `server.js` under `apps/<app>/.next/standalone/`. We point
 *     PM2 at those files directly so the production box does NOT need a
 *     copy of the workspace `node_modules`.
 *   • `cluster_mode` lets PM2 fork one Node worker per CPU core. On
 *     entry-level Xneelo VPS this is typically 2–4 workers.
 *   • Env vars are loaded from `.env.production` at the *workspace root*
 *     via `dotenv -e ...` baked into each app's `script` invocation.
 *     If you prefer cPanel's "Setup Node.js App" UI, leave the `env`
 *     blocks empty — cPanel will inject the same vars into process.env.
 *
 * Usage on the server:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save
 *   pm2 startup            # generate the systemd / init unit
 *
 * Health checks:
 *   curl http://127.0.0.1:3000/api/health
 *   curl http://127.0.0.1:3001/api/health
 */

const path = require('path');

const sharedEnv = {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  // Force Node to load .env.production from the workspace root.
  DOTENV_CONFIG_PATH: path.resolve(__dirname, '.env.production'),
};

module.exports = {
  apps: [
    {
      name: 'jbaybff-web',
      cwd: path.resolve(__dirname, 'apps/web/.next/standalone'),
      script: path.resolve(__dirname, 'apps/web/.next/standalone/apps/web/server.js'),
      // Standalone output preserves workspace structure under .next/standalone,
      // so the actual server entry lives at apps/web/server.js *inside* the
      // standalone dir. PM2 chdirs into `cwd`, then resolves `script` absolutely.
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      kill_timeout: 5000,
      listen_timeout: 8000,
      env: {
        ...sharedEnv,
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
      },
      env_production: {
        ...sharedEnv,
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
      },
      out_file: path.resolve(__dirname, 'logs/web-out.log'),
      error_file: path.resolve(__dirname, 'logs/web-err.log'),
      merge_logs: true,
      time: true,
    },
    {
      name: 'jbaybff-admin',
      cwd: path.resolve(__dirname, 'apps/admin/.next/standalone'),
      script: path.resolve(__dirname, 'apps/admin/.next/standalone/apps/admin/server.js'),
      instances: 1, // admin doesn't need cluster — single worker keeps it simple
      exec_mode: 'fork',
      max_memory_restart: '384M',
      kill_timeout: 5000,
      listen_timeout: 8000,
      env: {
        ...sharedEnv,
        PORT: 3001,
        HOSTNAME: '127.0.0.1',
      },
      env_production: {
        ...sharedEnv,
        PORT: 3001,
        HOSTNAME: '127.0.0.1',
      },
      out_file: path.resolve(__dirname, 'logs/admin-out.log'),
      error_file: path.resolve(__dirname, 'logs/admin-err.log'),
      merge_logs: true,
      time: true,
    },
  ],
};
