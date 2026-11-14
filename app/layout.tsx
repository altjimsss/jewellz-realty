import "./globals.css";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthRecoveryListener } from "@/components/auth/AuthRecoveryListener";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: { default: "J'WELLZ REALTY MARKETING AND DEVELOPMENT CORP.", template: "%s | J'WELLZ REALTY" },
  description: "J'WELLZ REALTY MARKETING AND DEVELOPMENT CORP. — Change the Dream Property.",
  icons: {
    icon: [
      { url: "/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon-32.png?v=2",
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <AuthRecoveryListener />
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}

