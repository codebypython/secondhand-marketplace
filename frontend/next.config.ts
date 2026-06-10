import type { NextConfig } from "next";

const port = process.env.PORT || "3000";

const nextConfig: NextConfig = {
  distDir: `.next_${port}`,
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  }
};

export default nextConfig;
