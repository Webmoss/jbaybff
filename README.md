# Jeffreys Bay Blue Flag Foundation (JBay BFF)

Vue 3 SPA (`apps/web`) + NestJS API (`apps/api`), Prisma/MySQL-first database, JWT + RBAC (`ADMIN · DONOR · SPONSOR`), campaigns + sponsors + TipTap-backed blog CMS fields, hashed passwords, throttle + helmet protections, SPA-friendly sitemap at `/api/seo/sitemap.xml`.

## Bootstrap (host machine)

```bash
cp .env.example .env

docker compose up -d mysql
pnpm install
pnpm --filter api prisma:push
pnpm db:seed
pnpm dev   # SPA on :5173, API :3000 (/api prefix)
```

`SITE_URL` in root `.env` anchors absolute URLs emitted by `/api/seo/sitemap.xml`. Multi-language scaffolding starts in `apps/web/src/locales/en.ts` (promote later to `vue-i18n`).  

### Required root `.env` keys

At minimum, set these before running locally:

- `DATABASE_URL` (host run; usually `127.0.0.1`)
- `DATABASE_URL_DOCKER` (container network; host is `mysql`)
- `JWT_SECRET`
- `CORS_ORIGIN`
- `SITE_URL`
- `VITE_API_URL`
- `VITE_ASSET_BASE`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_CALLBACK_URL`

Start from `.env.example` and adjust values for your machine.

## Bootstrap (Docker: web + api + mysql)

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:5173` for the SPA.

Root `.env` is the single source of config for both Docker and direct runs.

Useful commands:

```bash
# one-time seed
docker compose exec api pnpm --filter api prisma:seed

# stop containers
docker compose down

# full reset including MySQL data
docker compose down -v
```

See **`DEPLOYMENT.md`** for Xneelo shared vs VPS rollout, Postgres optionality, SPA reverse-proxy recipes, Paystack flow, outbound email placeholders, analytics snippets.
