/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;