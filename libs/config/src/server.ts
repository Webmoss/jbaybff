import { z } from 'zod';

/**
 * Server-only environment configuration.
 *
 * This module validates env vars at runtime using Zod and exposes a typed
 * `serverEnv` object. Importing it from the browser will throw — by design —
 * so secrets cannot leak into the client bundle.
 *
 * On Xneelo (cPanel/Linux) deployments env vars are typically injected via
 * one of three methods:
 *   1. PM2 `ecosystem.config.cjs` `env` block (preferred — see /ecosystem.config.cjs)
 *   2. A `.env.production` file colocated with the built app
 *   3. cPanel "Setup Node.js App" environment variables UI
 *
 * `loadEnv()` is tolerant of all three approaches because Next.js loads
 * `.env*` files automatically and PM2 injects vars into `process.env` before
 * the Node process starts.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    '[@jbaybff/config] `server.ts` was imported from the browser. Use `client.ts` instead.',
  );
}

const booleanString = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === 'true' || v === '1');

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),

  // Database — Xneelo MySQL or managed Postgres
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required (e.g. mysql://user:pass@host:3306/db or postgresql://...)'),
  DATABASE_PROVIDER: z.enum(['mysql', 'postgresql']).default('mysql'),
  DATABASE_SHADOW_URL: z.string().optional(),

  // Public URLs
  NEXT_PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().default('http://localhost:3001'),

  // Auth (admin app — placeholder for next step)
  AUTH_SECRET: z.string().min(16).optional(),
  ADMIN_EMAIL_ALLOWLIST: z.string().optional(),

  // Paystack
  PAYSTACK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),

  // Mail (nodemailer / SMTP — Xneelo provides SMTP per mailbox)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SMTP_SECURE: booleanString.default('false'),

  // Newsletter provider hook (Mailchimp / Brevo / etc.)
  NEWSLETTER_PROVIDER: z.enum(['none', 'mailchimp', 'brevo', 'mailerlite']).default('none'),
  NEWSLETTER_API_KEY: z.string().optional(),
  NEWSLETTER_LIST_ID: z.string().optional(),

  // Tax certificates — SARS Section 18A
  ORG_LEGAL_NAME: z.string().default('Jeffreys Bay Blue Flag Foundation NPC'),
  ORG_REGISTRATION_NUMBER: z.string().default('TBD'),
  ORG_PBO_NUMBER: z.string().default('TBD'),
  ORG_TAX_REFERENCE: z.string().default('TBD'),
  ORG_PHYSICAL_ADDRESS: z
    .string()
    .default('Jeffreys Bay, Kouga Local Municipality, Eastern Cape, South Africa'),
  ORG_CONTACT_EMAIL: z.string().email().default('info@jbaybff.org.za'),
  ORG_CONTACT_PHONE: z.string().default('+27 00 000 0000'),
  TAX_CERTIFICATE_SIGNATORY_NAME: z.string().default('Authorised Signatory'),
  TAX_CERTIFICATE_SIGNATORY_TITLE: z.string().default('Trustee'),

  // Storage paths (for generated PDFs etc. on Xneelo disk)
  STORAGE_DIR: z.string().default('./storage'),
  TAX_CERTIFICATE_DIR: z.string().default('./storage/tax-certificates'),

  // Feature flags
  FEATURE_IDEA_BOARD: booleanString.default('true'),
  FEATURE_ECOMMERCE: booleanString.default('true'),
  FEATURE_TAX_CERTIFICATES: booleanString.default('true'),

  // Tier 1 gift threshold (ZAR)
  TIER_1_GIFT_THRESHOLD_ZAR: z.coerce.number().int().positive().default(1000),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function loadEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    const message = Object.entries(formatted)
      .map(([key, errors]) => `  - ${key}: ${(errors ?? []).join(', ')}`)
      .join('\n');
    // Do NOT print actual values — only keys — to avoid leaking secrets in logs.
    throw new Error(
      `[@jbaybff/config] Invalid environment variables:\n${message}\n` +
        `Refer to .env.example at the workspace root for required keys.`,
    );
  }

  cached = parsed.data;
  return cached;
}

export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    const env = loadEnv();
    return env[prop as keyof ServerEnv];
  },
});
