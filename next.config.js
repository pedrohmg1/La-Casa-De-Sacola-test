/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.2'],

  productionBrowserSourceMaps: false,
  
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;