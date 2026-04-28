# JBay BFF — Jeffreys Bay Blue Flag Foundation

Monorepo for the Jeffreys Bay Blue Flag Foundation digital platform.

> **Mission:** Earn and keep Blue Flag status for Jeffreys Bay through cleanups,
> education, water-quality monitoring, and bold community action.

## What's in here

```text
jbaybff/
├── apps/
│   ├── web/          → Public site (Next.js 14 App Router)
│   └── admin/        → Admin dashboard (Next.js 14 App Router)
├── libs/
│   ├── prisma/       → Single source of truth for the data model + Prisma client
│   ├── ui/           → Design tokens (palette, typography, motifs) + shared components
│   ├── config/       → Zod-validated env config (server + client splits)
│   └── types/        → Cross-package domain types
├── tools/
│   └── deploy/       → Xneelo deployment artifacts (PM2, Nginx, Apache, build script)
├── ecosystem.config.cjs   → PM2 ecosystem (production)
├── nx.json                → NX workspace config
├── pnpm-workspace.yaml    → pnpm workspace declaration
└── tsconfig.base.json     → Shared TS paths + compiler options
```

## Tech stack

- **Monorepo** — NX 20 + pnpm workspaces
- **Apps** — Next.js 14 (App Router, standalone output)
- **UI** — Tailwind v3 with a shared preset, shadcn/ui-ready CSS variables
- **DB** — MySQL (Xneelo cPanel default) via Prisma 5; Postgres-swappable
- **Payments** — Paystack (ZAR + intl. cards) — wired in Step 3
- **PDFs** — `react-pdf`-based SARS Section 18A tax certificates — Step 3
- **Email** — nodemailer over Xneelo SMTP — Step 4
- **Deploy** — PM2 cluster behind Nginx (VPS) or Apache `.htaccess` proxy (cPanel)

## Quick start (local dev)

```bash
# 1. Install deps (pnpm 10+ required)
pnpm install

# 2. Spin up a local MySQL (or use Docker / Xneelo dev DB)
#    Then copy and edit env vars
cp .env.example .env
$EDITOR .env

# 3. Generate Prisma client + run migrations
pnpm prisma:migrate     # creates the first migration
pnpm prisma:seed        # seeds fund allocations + admin user

# 4. Run both apps
pnpm dev                # web on :3000, admin on :3001
# or run them individually
pnpm dev:web
pnpm dev:admin
```

Visit:
- Public site → http://localhost:3000
- Admin → http://localhost:3001
- Health probes → `/api/health` on each

## Step plan (we are here: Step 1)

| Step | Status | Scope |
|------|--------|-------|
| **1. Foundation**       | ✅ done | NX workspace, libs (`prisma`, `ui`, `config`, `types`), Next.js scaffolds, design tokens, Xneelo deployment toolkit. |
| **2. Public site UI**   | ⏳ next | Transparent-to-solid mega menu, hero with motifs, campaigns page, fund-allocation visualisation, idea-board UI, blog reader, SEO renderer. |
| **3. Donations + 18A**  | ⏳      | Paystack widget, donor capture, tier-1 gift trigger, SARS Section 18A PDF generator + admin certificate management. |
| **4. Admin platform**   | ⏳      | Admin auth, CMS CRUD (Posts, Campaigns), e-commerce (Products, Orders), idea-board moderation, dashboard metrics + charts. |
| **5. Notifications**    | ⏳      | nodemailer transactional emails, newsletter provider sync (Mailchimp / Brevo), audit logs, webhooks. |

## Common scripts

```bash
pnpm dev                  # run web + admin in parallel
pnpm build                # build everything
pnpm typecheck            # tsc --noEmit across the workspace
pnpm lint                 # eslint everything
pnpm format               # prettier write
pnpm prisma:studio        # GUI for the DB
pnpm prisma:migrate       # interactive migration during dev
pnpm graph                # NX project graph

# Deploy
pnpm deploy:build         # produces .xneelo-build/
node tools/deploy/xneelo-build.mjs --tar    # also tarball it
```

## Deployment

See [`tools/deploy/XNEELO_DEPLOYMENT.md`](./tools/deploy/XNEELO_DEPLOYMENT.md)
for the full walkthrough — provisioning the box, building the artifact,
running migrations, configuring PM2, wiring Nginx or Apache, and
zero-downtime updates.

## Design language

The aesthetic is encoded in `libs/ui/src/tokens/`:

- **`colors.ts`** — Deep Ocean Blue (#0F4C75), Teal (#138278), Coral Red (#D23B26),
  Cream (#FBF6E9), Sun (#F2C94C). All exposed as both raw hex and HSL
  CSS variables for shadcn/ui compatibility.
- **`typography.ts`** — Display: Archivo Black (chunky geometric).
  Body: Inter. Mono: JetBrains Mono.
- **`motifs.ts`** — Manifest of the beach iconography (wave, surfboard,
  palm tree, spiral shell, sun, fish, bird, coral, SURF wordmark) with
  default brand colours and recommended usage contexts. SVG implementations
  ship in Step 2.

Both apps consume the same Tailwind preset (`@jbaybff/ui/tailwind-preset`)
so colours, fonts, and animations stay in lockstep across surfaces.

## Environment variables

See `.env.example` at the repo root for the full list with inline docs.
Validation is centralised in `libs/config/src/server.ts` (Zod) — invalid
or missing required vars throw at process boot rather than silently
producing 500s in production.

## Legal & compliance notes

- **SARS Section 18A**: tax certificate generation is implemented in
  Step 3 with PDF outputs stored under `STORAGE_DIR` (defaults to
  `./storage/tax-certificates`). Certificates capture an immutable
  snapshot of donor + organisation details at issue time so reprints
  don't drift if the live data changes.
- **POPIA**: donor consent flags (`consentMailingList`, `consentMailingAt`,
  `unsubscribedAt`) are tracked in the `donors` table. Idea board
  submissions hash IPs rather than storing raw addresses.
- **Audit trail**: every mutation in the admin dashboard writes an
  `AuditLog` row (Step 4).

## Licence

UNLICENSED — © Jeffreys Bay Blue Flag Foundation NPC.
