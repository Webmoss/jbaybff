/**
 * Typography tokens — paired display + body fonts to match the bold,
 * mid-century-modern aesthetic of `image_0.png`.
 *
 * Display: a chunky geometric sans (e.g. "Archivo Black" / "Bricolage
 * Grotesque" / "Familjen Grotesk"). We default to Archivo for headlines
 * and Inter for body. Both are loaded via `next/font` per app.
 */

export const typography = {
  display: {
    family: '"Archivo Black", "Archivo", system-ui, -apple-system, sans-serif',
    weight: 900,
    letterSpacing: '-0.01em',
    textTransform: 'uppercase' as const,
  },
  heading: {
    family: '"Archivo", system-ui, -apple-system, sans-serif',
    weight: 800,
    letterSpacing: '-0.005em',
  },
  body: {
    family: '"Inter", system-ui, -apple-system, sans-serif',
    weight: 400,
    letterSpacing: '0',
  },
  mono: {
    family: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
  scale: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
    '8xl': '6rem',
    '9xl': '8rem',
  },
} as const;
