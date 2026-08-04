import { Suspense } from "react";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AppointmentBooking } from "@/components/appointment/AppointmentBooking";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Book an Appointment | Jewellz Realty",
  description: "Schedule a property viewing or consultation appointment with Jewellz Realty.",
};

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

export default function AppointmentPage() {
  return (
    <main className={`${poppins.className} min-h-screen bg-white text-[#171717]`}>
      <Navbar links={navLinks} fontClassName={poppins.className} />
      <Suspense fallback={<div className="py-32 text-center text-sm text-black/40">Loading…</div>}>
        <AppointmentBooking />
      </Suspense>
      <Footer />
    </main>
  );
}
