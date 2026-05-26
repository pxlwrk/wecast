import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  // Proxy API calls to FastAPI backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self)" },
        ],
      },
      // Embed pages: allow iframing from company domains
      {
        source: "/embed/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self' *.company.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
