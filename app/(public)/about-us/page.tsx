import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import SectionHeader from "@/components/layout/SectionHeader";
import { Poppins } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "About Us | Jewellz Realty",
  description: "Learn about Jewellz Realty, our brokerage team, values, and real estate services.",
};

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

const stats = [
  { value: "5.6M+", label: "Downloads" },
  { value: "3.2+", label: "Active Users" },
  { value: "4.9", label: "Ratings" },
  { value: "60+", label: "Team Members" },
];

const highlights = [
  {
    title: "Why Choose Jewellz Realty?",
    description: "We pair curated listings with clear guidance so buyers can move confidently from browsing to booking to closing.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M4 12l5-5 3 3 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Our Vision",
    description: "To make property discovery feel simple, modern, and trustworthy for every Filipino family and investor.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M12 21s6-4.5 6-10a6 6 0 10-12 0c0 5.5 6 10 6 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: "Our Team",
    description: "A hands-on group of agents, advisors, and support staff focused on quick responses and a better client experience.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M7 19a5 5 0 0110 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
];

const teamMembers = [
  {
    name: "Tom Cruise",
    role: "Founder & Chairman",
    image: "/assets/broker.png",
  },
  {
    name: "Emma Watson",
    role: "Managing Director",
    image: "/assets/bannerprofessional.png",
  },
  {
    name: "Will Smith",
    role: "Product Designer",
    image: "/assets/bannerconsult.png",
  },
];

export default function AboutUsPage() {
  return (
    <main className={`${poppins.className} bg-white text-[#111111]`}>
      <AnnouncementBar />
      <Navbar links={navLinks} fontClassName={poppins.className} />

      <section className="mx-auto w-full max-w-[1120px] px-6 py-14 lg:px-8">
        <div className="rounded-[24px] bg-white px-0 py-0">
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_0.98fr] lg:gap-12">
            <div>
              <SectionHeader title={"About Us"} subtitle={"Redefining the way people discover property."} />

              <h1 className="mt-4 max-w-xl text-[clamp(2.05rem,3.7vw,3.2rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[#111111]">
                Discover Jewellz Realty
              </h1>

              <p className="mt-4 max-w-[430px] text-[14px] leading-7 text-black/55">
                Jewellz Realty helps buyers and investors find the right property with less friction and more confidence.
                We combine curated listings, responsive support, and thoughtful presentation so every step feels clear and professional.
              </p>

              <div className="mt-6">
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full bg-[#DE141C] px-5 py-3 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[#c01018]"
                >
                  Contact Us
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 sm:gap-x-8">
                {stats.map((item, index) => (
                  <div key={item.label} className={`min-w-0 ${index < 3 ? "sm:border-r sm:border-black/8 sm:pr-6" : ""}`}>
                    <div className="text-[18px] font-semibold tracking-[-0.03em] text-[#DE141C] sm:text-[20px]">{item.value}</div>
                    <div className="mt-1 text-[13px] text-black/55">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[18px] bg-white">
                <Image
                  src="/assets/housebanner1.png"
                  alt="Jewellz Realty property showcase"
                  width={1100}
                  height={820}
                  className="h-auto w-full rounded-[18px] object-cover shadow-[0_12px_38px_rgba(0,0,0,0.08)]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.title} className="rounded-[16px] border border-black/10 bg-white px-5 py-5 shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[#DE141C]">
                  {item.icon}
                </div>
                <h2 className="text-[14px] font-semibold text-black">{item.title}</h2>
                <p className="mt-2 text-[12.5px] leading-6 text-black/55">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-6 flex items-start gap-3">
            <span className="mt-1.5 h-[2.2em] w-[3px] shrink-0 rounded-full bg-[#DE141C]" aria-hidden="true" />
            <div>
              <h2 className="font-semibold leading-tight text-zinc-900" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px" }}>
                Our Leadership
              </h2>
              <p className="mt-[2px] font-normal leading-tight text-zinc-400" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px" }}>
                The executives guiding the vision and direction of Jewellz Realty.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {teamMembers.map((member) => (
              <article key={member.name} className="bg-white">
                <div className="relative aspect-[1.08] overflow-hidden rounded-[6px] bg-zinc-100">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-contain object-center"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>

                <div className="pt-3">
                  <h3 className="text-[19px] font-medium leading-tight text-zinc-900">{member.name}</h3>
                  <p className="mt-1 text-[11px] leading-tight text-zinc-500">{member.role}</p>

                  <div className="mt-3 flex items-center gap-4 text-zinc-700">
                    <span className="text-[13px] leading-none">𝕏</span>
                    <span className="text-[13px] leading-none">◎</span>
                    <span className="text-[13px] leading-none">in</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
