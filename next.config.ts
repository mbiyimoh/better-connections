import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Disable React Strict Mode in dev - it causes double-mounting which
  // breaks speech recognition (mic toggles on/off rapidly)
  reactStrictMode: false,
};

export default nextConfig;
