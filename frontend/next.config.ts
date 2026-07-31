import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Cloudinary-hosted images through next/image if it's ever used.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
