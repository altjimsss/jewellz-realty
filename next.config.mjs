/** @type {import('next').NextConfig} */
import { fileURLToPath } from "node:url";

const nextConfig = {
  allowedDevOrigins: ["192.168.56.1", "192.168.68.101", "192.168.1.199", "10.169.78.126"],
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node", "sharp"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "recharts",
      "echarts",
      "echarts-for-react",
      "framer-motion",
      "gsap",
      "@base-ui/react"
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  }
};

export default nextConfig;
