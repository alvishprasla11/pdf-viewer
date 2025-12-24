import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Disable server-side features for Electron
  trailingSlash: true,
};

export default nextConfig;
