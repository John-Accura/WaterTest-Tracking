import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
