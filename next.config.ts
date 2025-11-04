import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        port: "",
      }
    ]
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
