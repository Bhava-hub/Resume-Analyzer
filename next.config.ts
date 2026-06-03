import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow local network devices (e.g. phone/tablet) to receive HMR updates
  allowedDevOrigins: ['192.168.29.190'],
};

export default nextConfig;
