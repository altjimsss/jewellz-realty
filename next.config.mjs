/** @type {import('next').NextConfig} */
import { fileURLToPath } from "node:url";

const nextConfig = {
  allowedDevOrigins: ["192.168.56.1", "192.168.68.101"],
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  }
};

export default nextConfig;
