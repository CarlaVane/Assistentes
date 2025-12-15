/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  turbopack: {
    debugIds: false,
  },
  typescript: {
    ignoreBuildErrors: true, // Coloque true temporariamente
  },
};

module.exports = nextConfig;
