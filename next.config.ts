import type { NextConfig } from "next";

const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || process.env.WOOCOMMERCE_API_URL || "https://localhost";
const wpHostname = new URL(wpUrl).hostname;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    dangerouslyAllowLocalIP: true,
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: wpHostname,
        port: '',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;