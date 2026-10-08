import "./globals.css";
import "leaflet/dist/leaflet.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthRecoveryListener } from "@/components/auth/AuthRecoveryListener";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Jewellz Realty",
  description: "AI-Driven Real Estate Platform"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <AuthRecoveryListener />
        {children}
      </body>
    </html>
  );
}

