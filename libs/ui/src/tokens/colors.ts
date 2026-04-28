/**
 * JBay BFF colour tokens — derived from the master aesthetic guide
 * (`image_0.png`).
 *
 * Mid-century modern beach palette: bold geometric blocks of Deep Ocean Blue,
 * Teal, Coral Red, and Cream. Accent colours (Sun Yellow, Sand, Driftwood)
 * support iconography and section backgrounds without diluting the brand.
 *
 * Each colour exports a hex value AND a CSS variable name so we can theme
 * Tailwind v3 (HSL channels) and shadcn/ui semantic tokens consistently.
 */

export const palette = {
  // Primary — Deep Ocean Blue
  oceanBlue: {
    50: '#EAF2F7',
    100: '#C9DDE8',
    200: '#94BCD2',
    300: '#5E96B7',
    400: '#2F719B',
    500: '#0F4C75', // brand primary
    600: '#0B3F62',
    700: '#08304B',
    800: '#052236',
    900: '#031624',
  },
  // Secondary — Teal (lagoon)
  teal: {
    50: '#E5F5F4',
    100: '#BFE6E2',
    200: '#86CCC5',
    300: '#4DB1A7',
    400: '#22978B',
    500: '#138278', // brand secondary
    600: '#106B63',
    700: '#0C524C',
    800: '#083A35',
    900: '#052824',
  },
  // Accent — Coral Red
  coralRed: {
    50: '#FCEEEC',
    100: '#F8D2CD',
    200: '#F1A89F',
    300: '#E97D70',
    400: '#E05544',
    500: '#D23B26', // brand accent
    600: '#AD2E1D',
    700: '#812217',
    800: '#561610',
    900: '#2D0B08',
  },
  // Background — Cream / Sand
  sand: {
    50: '#FBF7EE',
    100: '#F6EFD9',
    200: '#EFE0B7',
    300: '#E6CE91',
    400: '#D8B86A',
    500: '#C5A04E', // brand sand
    600: '#A0823E',
    700: '#79622F',
    800: '#52431F',
    900: '#2C2410',
  },
  // Highlight — Sun Yellow
  sun: {
    500: '#F2C94C',
    600: '#D7A82B',
  },
  // Neutrals (warm-tinted to harmonise with cream background)
  ink: {
    900: '#1B1F23',
    700: '#3A3F45',
    500: '#6B7178',
    300: '#A8AEB5',
    100: '#E3E5E8',
    50: '#F6F7F8',
  },
  cream: '#FBF6E9', // primary page background
  driftwood: '#7A5C3E',
} as const;

export type PaletteKey = keyof typeof palette;

/**
 * Semantic token map for shadcn/ui. Each entry is a CSS variable name (without
 * the leading `--`) → HSL triplet string (no `hsl()` wrapper).
 *
 * shadcn/ui consumes these as `hsl(var(--primary))` etc., which is why we
 * store HSL channels and not hex.
 */
export const semanticTokens = {
  background: '40 67% 95%', // cream
  foreground: '210 11% 13%', // ink/900

  card: '0 0% 100%',
  'card-foreground': '210 11% 13%',

  popover: '0 0% 100%',
  'popover-foreground': '210 11% 13%',

  primary: '203 78% 26%', // oceanBlue/500
  'primary-foreground': '40 67% 95%',

  secondary: '173 75% 28%', // teal/500
  'secondary-foreground': '40 67% 95%',

  accent: '8 70% 49%', // coralRed/500
  'accent-foreground': '40 67% 95%',

  muted: '40 32% 88%',
  'muted-foreground': '210 8% 35%',

  destructive: '8 70% 49%',
  'destructive-foreground': '40 67% 95%',

  border: '40 25% 80%',
  input: '40 25% 80%',
  ring: '203 78% 26%',

  // Brand-specific extensions used by JBay BFF surfaces
  'brand-ocean': '203 78% 26%',
  'brand-teal': '173 75% 28%',
  'brand-coral': '8 70% 49%',
  'brand-sand': '40 50% 75%',
  'brand-sun': '45 87% 62%',
} as const;
