# Jeffreys Bay Blue Flag Foundation (JBay BFF)

Jeffreys Bay Blue Flag Foundation’s digital platform for protecting and uplifting the J-Bay coastline through community action, transparent fundraising, and partner collaboration.

This repository powers the public website, supporter donation journeys, partnership workflows, and admin operations used to run campaigns and report impact.

## At a Glance

- **Mission:** protect and restore the Jeffreys Bay coastline through practical, community-led programs.
- **Who it serves:** residents, supporters, sponsors, volunteers, and campaign administrators.
- **What is live:** public storytelling + campaign funnels, Paystack-backed donations/shop, and role-based admin operations.

Stack: Vue 3 (`apps/web`), NestJS (`apps/api`), Prisma/MySQL, JWT RBAC, Paystack payments.

## Current Scope

- Public: campaigns, blog, actions, events, impact, partnerships, shop.
- Payments: donation + shop checkout with Paystack verify/webhooks.
- Admin: users, sponsors, campaigns, blog/media, actions/events, partnerships, retention, impact, shop.
- Governance: retention outbox/retries/templates/consent, audit logs, donation/engagement exports.
- SEO/perf: route-shell prerender pilot + baseline report (`apps/web/dist/perf-baseline.json`).

## Quick Start (Host Machine)

```bash
cp .env.example .env
cp .env apps/api/.env
docker compose up -d mysql
pnpm install
pnpm --filter api prisma:push
pnpm db:seed
pnpm dev
```

Runs SPA on `:5173` and API on `:3000` (with `/api` prefix).

Note: `apps/api` reads its local `.env` when started via `pnpm dev:api`/workspace scripts, so keep `apps/api/.env` in sync with root `.env` for local development.

Useful health endpoints:

- `GET /api/health` (service heartbeat + uptime metadata)
- `GET /api/health/version` (service version + active environment)
- `GET /api/health/ready` (readiness probe including database connectivity)

## Quick Start (Docker: Web + API + MySQL)

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:5173`.

Useful commands:

```bash
# one-time seed
docker compose exec api pnpm --filter api prisma:seed

# stop containers
docker compose down

# full reset including MySQL data
docker compose down -v
```

## Required Root `.env` Keys

At minimum:

- `DATABASE_URL`
- `DATABASE_URL_DOCKER`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `SITE_URL`
- `VITE_API_URL`
- `VITE_ASSET_BASE`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_CALLBACK_URL`
- `PAYSTACK_RECURRING_CALLBACK_URL`
- `PAYSTACK_SHOP_CALLBACK_URL`

Start from `.env.example` and adjust values for your machine.

## Deployment (Xneelo + VPS)

Use this as a deployment playbook for either classic Xneelo shared hosting or a managed VPS setup.

### Database

- MySQL is recommended and already configured in Prisma.
- PostgreSQL is optional for VPS deployments; switch provider + `DATABASE_URL` and run migrations from `apps/api`.

### Hosting Topologies

- **VPS/dedicated:** run Nest with systemd/PM2, fronted by nginx.
- **Shared hosting:** serve static SPA files and host the API elsewhere (or upgrade to VPS).

Suggested nginx pattern:

```nginx
location /uploads { proxy_pass http://127.0.0.1:3000; }
location /api {
  rewrite ^/api/(.*)$ /api/$1 break;
  proxy_pass http://127.0.0.1:3000;
}
location / {
  root /var/www/jbaybff-dist;
  try_files $uri $uri/ /index.html;
}
```

Deploy workflow:

```bash
pnpm --filter api build
pnpm --filter web build
pnpm --filter api prisma:migrate
pm2 restart jbaybff-api
```

### Post-Deploy Checklist

1. Rotate `ADMIN_SEED_PASSWORD`.
2. Validate Paystack webhook endpoint `/api/webhooks/paystack`.
3. Validate donation + shop payment end-to-end.
4. Configure receipt email provider and analytics tags.

### Payments Notes (South Africa)

- Primary gateway: [Paystack](https://paystack.com/) (ZAR settlement to a South African bank).
- Keep canonical money values in ZAR in the database.
- Finalize payment state from verified webhooks; do not trust return URLs alone.

Recurring runner controls:

- `DONATIONS_RECURRING_RUNNER_ENABLED`
- `DONATIONS_RECURRING_RUNNER_INTERVAL_MS` (default `900000`)
- `DONATIONS_RECURRING_RUNNER_BATCH_SIZE` (default `25`)
- `DONATIONS_RECURRING_RUNNER_DRY_RUN`

Admin endpoints:

- `POST /api/donations/admin/recurring/run`
- `GET /api/donations/admin/recurring/runner-health`

## SEO/Performance Pilot

High-intent pilot routes:

- `/`
- `/campaigns`
- `/blog`
- `/events`
- `/actions`
- `/impact`
- `/shop`

What the pilot does:

1. Builds the web app.
2. Writes static route shells (`index.html`) for approved routes.
3. Produces `dist/perf-baseline.json` with:
   - JS/CSS totals
   - Largest bundles
   - Route-shell checks
   - Pass/fail thresholds

Commands:

- `pnpm --filter web build:seo-pilot`
- `pnpm --filter web perf:baseline`

Notes:

- Current pilot is shell prerendering, not full SSR HTML rendering.
- Next iteration can move to true SSR/prerender with route data hydration.

## Search Console Handoff (Go-Live)

Use this checklist once production is reachable at `https://www.jbaybff.org.za/`.

### Preconditions

- Canonical host resolves over HTTPS: `https://www.jbaybff.org.za/`.
- `robots.txt` is reachable at `/robots.txt`.
- Sitemap is reachable at `/api/seo/sitemap.xml`.
- Public pages return indexable metadata (title, description, canonical, OG).

### Google Search Console

1. Add domain/property for `https://www.jbaybff.org.za/`.
2. Verify ownership (DNS TXT recommended).
3. Submit sitemap: `https://www.jbaybff.org.za/api/seo/sitemap.xml`.
4. Request indexing for key URLs:
   - `/`
   - `/campaigns`
   - `/blog`
   - `/actions`
   - `/events`
   - `/impact`
   - `/shop`
5. Confirm no unexpected `noindex` pages in public routes.

### Bing Webmaster Tools

1. Add site property for `https://www.jbaybff.org.za/`.
2. Verify ownership.
3. Submit sitemap: `https://www.jbaybff.org.za/api/seo/sitemap.xml`.
4. Run URL inspection on key pages and resolve crawl issues.

### Weekly Post-Launch Checks (first month)

- Track coverage/indexing errors and fix broken canonical/meta tags.
- Track Core Web Vitals and address regressions.
- Re-submit updated sitemap after major content additions.
