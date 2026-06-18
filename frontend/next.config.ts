import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't fail production builds on lint errors (mostly pre-existing style
  // issues). Linting still runs locally and can run in CI separately.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
