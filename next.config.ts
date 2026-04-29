import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/insights-inline_6.html",
        },
      ],
    };
  },
};

export default nextConfig;
