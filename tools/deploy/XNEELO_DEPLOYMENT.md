# JBay BFF — Xneelo Deployment Guide

This guide walks you from a fresh Xneelo server to a fully running JBay BFF
platform: public site at `jbaybff.org.za` and admin dashboard at
`admin.jbaybff.org.za`.

> **TL;DR**
>
> ```bash
> # locally
> pnpm install
> pnpm prisma:generate
> pnpm deploy:build              # produces .xneelo-build/
> tar -czf jbaybff.tar.gz .xneelo-build .env.production
> scp jbaybff.tar.gz user@your-xneelo-host:/home/user/
>
> # on the Xneelo box
> mkdir -p /home/user/apps/jbaybff && cd /home/user/apps/jbaybff
> tar -xzf ~/jbaybff.tar.gz --strip-components=1
> mv .env.production ./.env.production
> pnpm dlx prisma migrate deploy --schema=libs/prisma/prisma/schema.prisma
> pm2 start ecosystem.config.cjs --env production
> pm2 save && pm2 startup
> ```

---

## 1. Choose your Xneelo plan tier

Xneelo offers three relevant tiers. Pick based on which features you have access to:

| Tier                          | Has Node? | Has root SSH? | Has PM2? | Notes |
|-------------------------------|-----------|---------------|----------|-------|
| **Web Hosting (cPanel)**      | Yes (via "Setup Node.js App") | No | Limited (per-user) | Easiest. Apache reverse proxies to your Node app. Use the `.htaccess` proxy approach. |
| **Cloud Hosting / SSD VPS**   | Yes       | **Yes**        | Yes (full) | Recommended. Use Nginx + PM2 cluster mode. |
| **Dedicated Server**          | Yes       | Yes            | Yes       | Same as VPS — overkill until traffic justifies it. |

The instructions below assume **Cloud Hosting / VPS** (root SSH).
Differences for shared cPanel are called out inline.

---

## 2. Provision the Xneelo box

### 2.1 Install Node.js 20 LTS

```bash
# As root on the VPS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs build-essential

# Verify
node --version    # should print v20.x
npm --version
```

If Xneelo gives you AlmaLinux/CloudLinux instead of Debian:

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs gcc-c++ make
```

### 2.2 Install pnpm + PM2

```bash
# Run as the deploy user (NOT root) so pnpm/pm2 install into ~/.local
useradd -m -s /bin/bash jbaybff
sudo -u jbaybff bash -lc 'curl -fsSL https://get.pnpm.io/install.sh | sh -'
sudo -u jbaybff bash -lc 'pnpm add -g pm2@latest'
```

### 2.3 Install MySQL or connect to an existing one

Xneelo cPanel and most VPS plans include MySQL/MariaDB out of the box.
Create a database and user via cPanel ("MySQL Databases") or via CLI:

```sql
CREATE DATABASE jbaybff CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'jbaybff_app'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON jbaybff.* TO 'jbaybff_app'@'localhost';
FLUSH PRIVILEGES;
```

> **Postgres alternative:** if you provision Postgres (Neon, Supabase, or
> a self-hosted instance), set `DATABASE_PROVIDER=postgresql` in
> `.env.production` AND change the `provider` line in
> `libs/prisma/prisma/schema.prisma` to `postgresql` BEFORE running
> `prisma generate`.

### 2.4 Install Nginx + Certbot (VPS only)

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

(Skip on shared cPanel — Apache + AutoSSL handle this.)

---

## 3. Build the deploy artifact (locally)

From your dev machine, in the workspace root:

```bash
# 1. Make sure your .env.production is filled in (NEVER commit it)
cp .env.example .env.production
$EDITOR .env.production

# 2. Build
pnpm install
pnpm deploy:build           # equivalent: node tools/deploy/xneelo-build.mjs

# 3. (Optional) tarball with --tar
node tools/deploy/xneelo-build.mjs --tar
```

This produces:

```
.xneelo-build/
├── BUILD_MANIFEST.json
├── ecosystem.config.cjs
├── apps/
│   ├── web/          (standalone server.js + node_modules + .next/static + public/)
│   └── admin/        (same)
└── libs/
    └── prisma/
        ├── package.json
        └── prisma/   (schema.prisma + migrations/)
```

The standalone build is the magic ingredient — it bundles only the runtime
deps each app actually uses, so you do **not** need to `pnpm install` on the
production box.

---

## 4. Upload to Xneelo

### Option A — `scp` / `rsync` (VPS)

```bash
# Local
rsync -av --delete --exclude logs/ .xneelo-build/ jbaybff@your-host:~/apps/jbaybff/
scp .env.production jbaybff@your-host:~/apps/jbaybff/.env.production
```

### Option B — cPanel File Manager (shared hosting)

1. Tarball the artifact: `tar -czf jbaybff.tar.gz -C .xneelo-build .`
2. In cPanel → File Manager, upload `jbaybff.tar.gz` and `.env.production`
   into a directory **outside `public_html`** (e.g. `~/apps/jbaybff`).
3. Use the cPanel "Extract" UI to unpack the tarball.

> **Why outside `public_html`?** The Next.js standalone server is the only
> thing that should serve traffic. Apache will reverse-proxy via `.htaccess`
> in `public_html/`. Keep the Node code OUT of the document root.

---

## 5. Run database migrations (first deploy only, then on every release)

```bash
ssh jbaybff@your-host
cd ~/apps/jbaybff

# Prisma needs its CLI; use pnpx so we don't bloat global installs
pnpm dlx prisma@5.22.0 migrate deploy --schema=libs/prisma/prisma/schema.prisma

# (one-time) seed
pnpm dlx tsx libs/prisma/seed/index.ts
```

If you don't have any migrations yet (first ever deploy):

```bash
# Locally, point DATABASE_URL at the Xneelo MySQL via SSH tunnel:
ssh -L 3306:localhost:3306 jbaybff@your-host
# in another terminal:
DATABASE_URL="mysql://jbaybff_app:PASS@localhost:3306/jbaybff" \
  pnpm --filter @jbaybff/prisma exec prisma migrate dev --name init

# This creates libs/prisma/prisma/migrations/<timestamp>_init/.
# Commit those migration files to git, rebuild the artifact, redeploy.
```

---

## 6. Start with PM2

```bash
cd ~/apps/jbaybff
pm2 start ecosystem.config.cjs --env production
pm2 status
pm2 logs jbaybff-web --lines 50
pm2 logs jbaybff-admin --lines 50

# Persist across reboots
pm2 save
pm2 startup    # outputs a one-liner — run it as printed
```

Verify the apps are live on localhost:

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3001/api/health
```

Both should respond with JSON containing `"status": "ok"`.

---

## 7. Wire up the public reverse proxy

### 7.1 VPS / Cloud Hosting (Nginx)

```bash
sudo cp ~/apps/jbaybff/tools/deploy/nginx-jbaybff.conf /etc/nginx/conf.d/jbaybff.conf
sudo nginx -t && sudo systemctl reload nginx

# TLS via Let's Encrypt
sudo certbot --nginx -d jbaybff.org.za -d www.jbaybff.org.za
sudo certbot --nginx -d admin.jbaybff.org.za
```

### 7.2 Shared cPanel (Apache)

1. In cPanel → **Domains**, add `admin.jbaybff.org.za` as a subdomain pointing
   at a different docroot (e.g. `~/admin_public_html`).
2. Copy `tools/deploy/htaccess-proxy.txt` into `~/public_html/.htaccess`
   (port 3000 — already configured for the public site).
3. Copy a modified version with port 3001 into `~/admin_public_html/.htaccess`.
4. Enable AutoSSL in cPanel → **SSL/TLS Status**.

> **Gotcha:** cPanel's "Setup Node.js App" tool will inject its own
> `.htaccess` that fights with yours. Either:
>
> - manage Node entirely with PM2 (recommended) and **delete** any cPanel
>   Node app entries, OR
> - let cPanel manage Node and abandon PM2 (you lose cluster mode and
>   ecosystem-driven config).

---

## 8. Verify end-to-end

```bash
curl https://jbaybff.org.za/api/health
curl https://admin.jbaybff.org.za/api/health
```

Both should return JSON. Visit the URLs in a browser to see the placeholder
Step 1 home page and admin landing.

---

## 9. Updating (subsequent releases)

```bash
# Locally
git pull && pnpm install
pnpm deploy:build --tar

# Upload artifact, then on the box:
ssh jbaybff@your-host
cd ~/apps/jbaybff
tar -xzf ~/jbaybff-<sha>.tar.gz
pnpm dlx prisma@5.22.0 migrate deploy --schema=libs/prisma/prisma/schema.prisma
pm2 reload ecosystem.config.cjs --update-env
```

`pm2 reload` keeps zero-downtime by spinning up new workers before draining
old ones. `--update-env` ensures any new env vars from `.env.production`
take effect.

---

## 10. Troubleshooting cheatsheet

| Symptom                                            | Likely cause                                                                                     |
|----------------------------------------------------|--------------------------------------------------------------------------------------------------|
| `EADDRINUSE :::3000` on `pm2 start`                | A previous `next dev` is still running. `pm2 delete all` then restart.                           |
| `PrismaClientInitializationError: P1001`           | DB host unreachable. Test with `mysql -h localhost -u jbaybff_app -p`.                           |
| `502 Bad Gateway` from Nginx/Apache                | PM2 process crashed. `pm2 logs jbaybff-web --err --lines 200`.                                   |
| Tailwind classes missing in production build       | The shared `libs/ui` paths aren't in each app's `tailwind.config.ts` `content` array.            |
| `Cannot find module '@jbaybff/prisma'` in standalone build | Missing `transpilePackages` entry in `next.config.mjs` — already configured here, just verify.   |
| Prisma `binary target not found`                   | Add the matching target to `generator client.binaryTargets` in `schema.prisma` (see comments).   |
| Memory pressure / OOM kills on small VPS           | Lower `PM2_INSTANCES` (e.g. `PM2_INSTANCES=2`) or reduce `max_memory_restart` in `ecosystem.config.cjs`. |
| `.env.production` values aren't loading            | Confirm PM2 was started from the directory that contains it, and that `dotenv` parsing isn't blocked by quoting issues. |

---

## 11. Backup & DR essentials

```bash
# Daily MySQL dump (cron at 02:00)
0 2 * * * /usr/bin/mysqldump -u jbaybff_app -p'PASS' jbaybff | gzip > /home/jbaybff/backups/jbaybff-$(date +\%F).sql.gz

# Storage dir (tax certificates etc.)
0 3 * * * tar -czf /home/jbaybff/backups/storage-$(date +\%F).tar.gz /home/jbaybff/apps/jbaybff/storage
```

Tax certificate PDFs (SARS Section 18A artefacts) are legally important —
mirror them to off-site storage (S3, Backblaze, or a Xneelo backup bucket).

---

## 12. What's NOT yet wired (subsequent steps)

This guide deliberately stops at "two healthy Next.js apps behind a proxy".
The remaining functional stack is built in later steps:

- **Step 2** – public site UI (mega menu, hero, motifs, campaigns, idea board)
- **Step 3** – Paystack donation flow + Tier-1 gift logic + SARS 18A PDFs
- **Step 4** – admin auth, CMS CRUD, e-commerce, dashboard metrics, moderation queue
- **Step 5** – nodemailer integration, newsletter provider sync, audit logs

Each subsequent step ships migrations under `libs/prisma/prisma/migrations/`
and you redeploy with the flow in §9.
