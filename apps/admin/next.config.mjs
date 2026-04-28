/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  experimental: {
    externalDir: true,
    instrumentationHook: true,
  },
  transpilePackages: ['@jbaybff/ui', '@jbaybff/config', '@jbaybff/types', '@jbaybff/prisma'],
};

export default nextConfig;
