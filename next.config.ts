import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind CSS v4 is compiled by the Turbopack loader below.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Keep server-only packages out of the client bundle.
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
