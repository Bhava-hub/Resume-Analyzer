import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep pdf-parse as a Node.js external so Turbopack doesn't try to bundle it
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
