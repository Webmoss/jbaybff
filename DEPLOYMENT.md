# Deploying JBay BFF on Xneelo (and VPS friends)

Use this as a playbook for either **classic Xneelo shared hosting** or a **manage-your-own VPS** where you control Node builds + reverse proxies.

## 1. Database choice recap

**MySQL (recommended)** — Every Xneelo cPanel/shared package ships managed MySQL. Prisma datasource already targets MySQL (`apps/api/prisma/schema.prisma`).

**PostgreSQL** — Preferable on modern VPS setups (RDS, Neon, Railway, Managed PG on XCloud). Swap `provider`, bump `DATABASE_URL`, run `pnpm exec prisma migrate` from `apps/api`. Postgres unlocks trigram/full-text tooling later—optional for MVP.

Local parity: run `docker compose up --build` (bundled Compose file spins `mysql` + `api` + `web`).

## 2. Environment variables

Root `.env` is the single source for both Docker Compose and direct process runs.

| Key | Purpose |
| --- | --- |
| `DATABASE_URL` | `mysql://user:pwd@host:3306/schema?connection_limit=5` pattern |
| `JWT_SECRET` | ≥ 32-char random secret |
| `JWT_EXPIRES_IN` | e.g., `7d` |
| `CORS_ORIGIN` | Comma list of SPA origins hitting the API (`https://jbaybff.org`, `https://www.jbaybff.org`) |
| `SITE_URL` | Canonical SPA origin powering `/api/seo/sitemap.xml` |
| `PORT` | Locally `3000`; production usually `8080`/socket behind reverse proxy |

`.env.example` mirrors the full root runtime contract.

### SPA origins (root `.env`)

```text
VITE_API_URL=https://api.jbaybff.org/api
VITE_ASSET_BASE=https://api.jbaybff.org
```

`VITE_ASSET_BASE` must be whatever host emits `/uploads/*` responses (normally the Nest process).

Rebuild the SPA whenever these change (`pnpm --filter web build`).

## 3. Hosting topologies on Xneelo

### A. VPS / dedicated — full stack

Ideal: run **Nest** under systemd or PM2, sit **nginx** out front terminating TLS:

```nginx
location /uploads {
  proxy_pass http://127.0.0.1:3000;
}

location /api {
  rewrite ^/api/(.*)$ /api/$1 break;
  proxy_pass http://127.0.0.1:3000;
}

location / {
  root /var/www/jbaybff-dist;
  try_files $uri $uri/ /index.html;
}
```

Ship `pnpm --filter api build`, `pnpm --filter web build`, migrate DB (`pnpm prisma:migrate`), seed admin once, then automate restarts (`pm2 restart jbaybff-api`).

Static assets (`dist/` from Vue) tolerate aggressive CDN caching except `index.html` (set `cache-control: no-store`).

### B. Pure shared PHP hosting

Node cannot daemonize indefinitely on many shared tiers. Typical pattern:

- Host the **built SPA + marketing pages** statically (FTP `dist/` to `public_html/`).
- Point `VITE_API_URL` to API living on VPS/Render/Fly.io OR upgrade to Xneelo VPS for Node affinity.

Cron-based Node jobs are brittle—avoid.

## 4. Operational checklist post-deploy

1. Rotate `ADMIN_SEED_PASSWORD` + remove seed script reliance on plaintext defaults.
2. Wire **donations** for an **SA-registered NPC with SA bank only**: use **Paystack** (see §7) — initialise transactions server-side, confirm via **webhooks**, idempotent writes to `Donation` rows (replace the current REST stub).
3. **Email**: hook Contact + donation receipts via Resend, Postmark, SES, etc.
4. **Analytics**: uncomment Plausible/Umami/GA snippets in SPA shell or inject via CSP-safe tag manager.

## 5. SEO & performance nuances

SPA alone means crawlers without JS budgets may miss hydrated meta. Options:

| Upgrade | Benefit |
| --- | --- |
| **Nuxt/Layers** migrating marketing routes server-rendered | Highest SEO fidelity |
| **vite-ssg** prerender homepage + pillar pages nightly | Lightweight middle ground |
| **Cloudflare crawler hints** caching HTML snapshots | Faster TTFB for bots |

`/api/seo/sitemap.xml` already enumerates static paths + `/blog/:slug` + `/campaigns/:slug` assuming `SITE_URL` matches branded domain.

## 6. Web3 / decentralised philanthropy readiness

Treat public blockchain touchpoints as *optional overlays* anchored on existing REST models:

1. Persist wallet addresses alongside `Donation.paymentIntentId` / `Donation.metadata` JSON for provenance proofs.
2. Offload signatures to frontend `wagmi/ethers` gated behind feature flags (`VITE_CHAIN_ID`, `WALLET_RPC_URL`).
3. Keep canonical accounting in fiat columns until treasurer signs off reconciliation.

This keeps auditors happy today while unlocking NFT receipts / treasury multisig DAO grants later—no schema rewrite beyond nullable columns + enums.

## 7. Payments — SA-registered NPC, SA bank only

**Primary gateway: [Paystack](https://paystack.com/) (South Africa)** — You onboard as a **ZA business**, receive **payouts in ZAR** to your **South African bank**, and enable **international card** payments when turned on in the dashboard. Pricing and local rails (e.g. card vs instant bank options) are published on Paystack’s ZA site; treat fees as **VAT-exclusive** where stated.

**Why not “Stripe Checkout” as the first integration?** A direct **Stripe** merchant account is tied to **Stripe-supported countries and settlement banks**. For a **ZA entity with only ZA banking**, **Paystack is the practical Stripe-family path** in-market (Stripe’s extended coverage in South Africa runs through Paystack). Avoid funneling NPC funds through foreign shell companies without proper legal and tax advice.

**Canonical money in your app:** Keep **ZAR** as the source of truth in the database (`Donation.amount` + `currency: 'ZAR'`). For overseas supporters paying by **foreign Visa/Mastercard**, Paystack still charges in **ZAR**; the **cardholder’s bank** may show an **estimated** equivalent in their home currency (issuer conversion / rules vary). That is normal and keeps **SARS-facing records** in rands.

**Optional second path — explicit “pick my currency” at checkout:** If you want donors to **choose USD/EUR/GBP (etc.) before paying** while you still **settle in ZAR**, evaluate **[Payfast Multi-Currency Pricing](https://payfast.io/features/multi-currency-pricing/)** (buyer-facing conversion from a ZAR base price). Many NPCs run **either** Paystack **or** Payfast; running **both** is possible but doubles reconciliation work — only add Payfast if that UX is worth the ops cost.

**Implementation sketch (Paystack):**

1. **Server-only secret key** — never expose `PAYSTACK_SECRET_KEY` to the Vue app.
2. **POST `/api/donations/checkout`** (or similar) — authenticated or guest flow: create a **Paystack transaction** with `amount` in **ZAR cents** (smallest unit: multiply rands by **100** — Paystack’s API expects subunits), `email`, `metadata` (`userId`, `campaignId`, `public_slug`).
3. **Return `authorization_url`** to the SPA; redirect the donor or embed Paystack Inline JS if you prefer on-site card fields.
4. **`POST /api/webhooks/paystack`** — verify `x-paystack-signature` (HMAC SHA512 of JSON body per Paystack docs), idempotently mark `Donation` **COMPLETED**, bump campaign `raisedAmount` only here (not on client return).
5. **Donor return URL** — show “Thank you” after redirect; **do not** treat return URL as proof of payment.

Add to root `.env` when integrating: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` (for Inline if used), `PAYSTACK_WEBHOOK_SECRET` (if Paystack issues a dedicated signing secret for your webhook endpoint — follow current dashboard docs).

**Compliance hygiene:** issue **Section 18A** receipts where applicable (outside this repo’s scope but drives receipt email templates), retain Paystack settlement reports for **audit trail**, and document who can refund from the Paystack dashboard.
