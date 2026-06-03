import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Do NOT bundle pdf-parse — its pdfjs-dist internals break when webpack-bundled on Vercel
  serverExternalPackages: ['pdf-parse'],
  // Allow local network devices (e.g. phone/tablet) to receive HMR updates
  allowedDevOrigins: ['192.168.29.190'],
};

export default nextConfig;
