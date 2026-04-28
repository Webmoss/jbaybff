/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Xneelo serves Node behind an Nginx/Apache reverse proxy. Use 'standalone'
  // output so we get a self-contained server bundle that PM2 can start
  // without `node_modules` on the production box.
  output: 'standalone',
  experimental: {
    // Keep workspace packages transpiled for Next 14
    externalDir: true,
    instrumentationHook: true,
  },
  transpilePackages: ['@jbaybff/ui', '@jbaybff/config', '@jbaybff/types', '@jbaybff/prisma'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.jbaybff.org.za' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
