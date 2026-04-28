import type { Config } from 'tailwindcss';
import { tailwindPreset } from '@jbaybff/ui/tailwind-preset';

const config: Config = {
  presets: [tailwindPreset as Config],
  content: [
    './src/**/*.{ts,tsx,mdx}',
    '../../libs/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
