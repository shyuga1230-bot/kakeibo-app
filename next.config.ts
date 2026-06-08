import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly set the project root so Next.js 16 doesn't detect a parent lockfile as the monorepo root
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
