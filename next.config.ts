import type { NextConfig } from "next";

const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || process.env.WOOCOMMERCE_API_URL || "https://localhost";
const wpHostname = new URL(wpUrl).hostname;

const nextConfig: NextConfig = {
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
};

export default nextConfig;