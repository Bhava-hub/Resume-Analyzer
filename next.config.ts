import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep pdf-parse as a Node.js external so Turbopack doesn't try to bundle it
  serverExternalPackages: ['pdf-parse'],
  // Allow local network devices (e.g. phone/tablet) to receive HMR updates
  allowedDevOrigins: ['192.168.29.190'],
};

export default nextConfig;
