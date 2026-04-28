/**
 * Shared Tailwind preset. Both `apps/web` and `apps/admin` extend this so
 * the JBay BFF aesthetic stays in sync across surfaces.
 */

import type { Config } from 'tailwindcss';
import { palette, semanticTokens } from './colors';
import { typography } from './typography';

const cssVar = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export const tailwindPreset: Partial<Config> = {
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        md: '2rem',
        lg: '3rem',
      },
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // shadcn semantic tokens (consumed via CSS vars)
        background: cssVar('background'),
        foreground: cssVar('foreground'),
        card: {
          DEFAULT: cssVar('card'),
          foreground: cssVar('card-foreground'),
        },
        popover: {
          DEFAULT: cssVar('popover'),
          foreground: cssVar('popover-foreground'),
        },
        primary: {
          DEFAULT: cssVar('primary'),
          foreground: cssVar('primary-foreground'),
        },
        secondary: {
          DEFAULT: cssVar('secondary'),
          foreground: cssVar('secondary-foreground'),
        },
        accent: {
          DEFAULT: cssVar('accent'),
          foreground: cssVar('accent-foreground'),
        },
        muted: {
          DEFAULT: cssVar('muted'),
          foreground: cssVar('muted-foreground'),
        },
        destructive: {
          DEFAULT: cssVar('destructive'),
          foreground: cssVar('destructive-foreground'),
        },
        border: cssVar('border'),
        input: cssVar('input'),
        ring: cssVar('ring'),

        // Brand-direct palette (when you want exact hex, not semantic)
        ocean: palette.oceanBlue,
        teal: palette.teal,
        coral: palette.coralRed,
        sand: palette.sand,
        sun: palette.sun,
        ink: palette.ink,
        cream: { DEFAULT: palette.cream },
        driftwood: { DEFAULT: palette.driftwood },
      },
      fontFamily: {
        display: typography.display.family.split(',').map((s) => s.trim().replace(/"/g, '')),
        heading: typography.heading.family.split(',').map((s) => s.trim().replace(/"/g, '')),
        sans: typography.body.family.split(',').map((s) => s.trim().replace(/"/g, '')),
        mono: typography.mono.family.split(',').map((s) => s.trim().replace(/"/g, '')),
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'wave-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'wave-bob': 'wave-bob 4s ease-in-out infinite',
        'fade-up': 'fade-up 0.4s ease-out',
      },
    },
  },
  // Plugins are added per-app to keep the preset framework-agnostic.
};

/**
 * Companion CSS-variable bundle. Apps import this from a global stylesheet
 * (`@import` or string-pasted into `globals.css`) so semantic tokens resolve
 * to the right HSL values.
 */
export const cssVariableBlock = `
:root {
  --radius: 0.5rem;
${Object.entries(semanticTokens)
  .map(([key, value]) => `  --${key}: ${value};`)
  .join('\n')}
}

.dark {
  /* Reserve dark-mode overrides for a future iteration. JBay BFF's brand
     leans into the cream/coral palette in light mode; dark mode should
     invert background→ink/900, foreground→cream, and dim the accents. */
  --background: 210 11% 8%;
  --foreground: 40 67% 95%;
  --card: 210 11% 11%;
  --card-foreground: 40 67% 95%;
  --popover: 210 11% 11%;
  --popover-foreground: 40 67% 95%;
  --primary: 173 75% 38%;
  --primary-foreground: 210 11% 8%;
  --secondary: 203 78% 36%;
  --secondary-foreground: 40 67% 95%;
  --accent: 8 70% 59%;
  --accent-foreground: 210 11% 8%;
  --muted: 210 11% 18%;
  --muted-foreground: 40 25% 75%;
  --destructive: 8 70% 49%;
  --destructive-foreground: 40 67% 95%;
  --border: 210 11% 22%;
  --input: 210 11% 22%;
  --ring: 173 75% 38%;
}
`;
