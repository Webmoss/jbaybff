import { z } from 'zod';

/**
 * Client-safe environment configuration.
 *
 * Only `NEXT_PUBLIC_*` vars are inlined into the client bundle by Next.js.
 * Anything imported here is safe to ship to the browser.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
});

export type ClientEnv = z.infer<typeof clientSchema>;

const raw = {
  NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
  NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
};

const parsed = clientSchema.safeParse(raw);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.warn('[@jbaybff/config] Public env validation failed:', parsed.error.flatten());
}

export const clientEnv: ClientEnv = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_WEB_URL: 'http://localhost:3000',
      NEXT_PUBLIC_ADMIN_URL: 'http://localhost:3001',
      NEXT_PUBLIC_APP_ENV: 'local',
    };
