import Link from "next/link";
import type { Metadata } from "next";
import SectionHeader from "@/components/layout/SectionHeader";
import { Poppins } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Compass, TrendingUp, UsersRound } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";
import { getPublicAboutPageContent } from "@/lib/supabase/content";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "About Us | Jewellz Realty",
  description: "Learn about Jewellz Realty, our brokerage team, values, and real estate services.",
};
export const dynamic = "force-dynamic";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

const highlightIcons = [TrendingUp, Compass, UsersRound];

function safeSocialUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export default async function AboutUsPage() {
  const about = await getPublicAboutPageContent();
  return (
    <main className={`${poppins.className} bg-white text-[#111111]`}>
      <AnnouncementBar />
      <Navbar links={navLinks} fontClassName={poppins.className} />

      <section className="mx-auto w-full max-w-[1120px] px-4 pb-10 pt-8 sm:px-6 sm:py-14 lg:px-8">
        <div className="rounded-[24px] bg-white px-0 py-0">
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.98fr] lg:gap-x-12 lg:gap-y-6">
            <div>
              <SectionHeader title={about.eyebrow} subtitle={about.subtitle} />

              <h1 className="mt-3 max-w-xl text-[clamp(1.75rem,3.7vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[#111111]">
                {about.title}
              </h1>

              <p className="mt-3 max-w-[430px] text-justify text-[13px] leading-6 text-black/55 sm:mt-4 sm:text-[14px] sm:leading-7">
                {about.introduction}
              </p>

              {about.ctaLabel ? <div className="mt-5">
                <Link
                  href={about.ctaUrl || "/contact"}
                  className="inline-flex min-h-10 items-center rounded-full bg-[#DE141C] px-5 py-2.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[#c01018]"
                >
                  {about.ctaLabel || "Contact Us"}
                </Link>
              </div> : null}
            </div>

            <div className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <div className="overflow-hidden rounded-[18px] bg-white">
                <SafeImage
                  src={about.heroImageUrl}
                  fallbackSrc="/assets/housebanner1.webp"
                  alt="Jewellz Realty property showcase"
                  width={1100}
                  height={820}
                  className="h-auto w-full rounded-[18px] object-cover shadow-[0_12px_38px_rgba(0,0,0,0.08)]"
                  priority
                />
              </div>
            </div>

            {about.stats.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#EAE7E3] pt-4 sm:grid-cols-4 sm:gap-x-8 lg:col-start-1 lg:row-start-2 lg:border-0 lg:pt-0">
              {about.stats.map((item, index) => (
                <div key={`${item.label}-${index}`} className={`min-w-0 ${index < 3 ? "sm:border-r sm:border-black/8 sm:pr-6" : ""}`}>
                  <div className="text-[17px] font-semibold tracking-[-0.03em] text-[#DE141C] sm:text-[20px]">{item.value}</div>
                  <div className="mt-0.5 text-xs text-black/55 sm:mt-1 sm:text-[13px]">{item.label}</div>
                </div>
              ))}
            </div> : null}
          </div>
        </div>
      </section>

      {about.highlights.length ? <section className="px-4 pb-10 sm:px-6 sm:pb-12 lg:px-8 lg:pb-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {about.highlights.map((item, index) => {
              const HighlightIcon = highlightIcons[index % highlightIcons.length];
              return (
                <article key={`${item.title}-${index}`} className="rounded-xl border border-black/10 bg-white px-4 py-4 shadow-[0_6px_18px_rgba(0,0,0,0.04)] sm:rounded-[16px] sm:px-5 sm:py-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[#DE141C]">
                    <HighlightIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-[13px] font-semibold text-black sm:text-[14px]">{item.title}</h2>
                  <p className="mt-1.5 text-justify text-xs leading-5 text-black/55 sm:mt-2 sm:text-[12.5px] sm:leading-6">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section> : null}

      {about.teamHeading || about.teamDescription || about.teamMembers.length ? <section className="px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-6 flex items-start gap-3">
            <span className="mt-1.5 h-[2.2em] w-[3px] shrink-0 rounded-full bg-[#DE141C]" aria-hidden="true" />
            <div>
              <h2 className="font-semibold leading-tight text-zinc-900" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "clamp(18px, 5vw, 22px)" }}>
                {about.teamHeading}
              </h2>
              <p className="mt-[2px] font-normal leading-tight text-zinc-400" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px" }}>
                {about.teamDescription}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {about.teamMembers.map((member, index) => (
              <article key={`${member.name}-${index}`} className="bg-white">
                <div className="relative aspect-[1.08] overflow-hidden rounded-md bg-zinc-100">
                  <SafeImage
                    src={member.imageUrl}
                    fallbackSrc="/assets/bannerprofessional.webp"
                    alt={member.name}
                    fill
                    className="object-contain object-center"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>

                <div className="pt-3">
                  <h3 className="text-[15px] font-medium leading-tight text-zinc-900 sm:text-[19px]">{member.name}</h3>
                  <p className="mt-1 text-[10px] leading-tight text-zinc-500 sm:text-[11px]">{member.role}</p>

                  <div className="mt-3 flex min-h-5 items-center gap-3 text-zinc-600">
                    {safeSocialUrl(member.twitterUrl) ? (
                      <a href={safeSocialUrl(member.twitterUrl)} target="_blank" rel="noopener noreferrer" aria-label="X / Twitter profile" className="transition-colors hover:text-[#DE141C]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.4L2.8 2h6.5l4.5 6L18.9 2Zm-1.1 17.8h1.7L8.3 4H6.5l11.3 15.8Z" /></svg>
                      </a>
                    ) : null}
                    {safeSocialUrl(member.instagramUrl) ? (
                      <a href={safeSocialUrl(member.instagramUrl)} target="_blank" rel="noopener noreferrer" aria-label="Instagram profile" className="transition-colors hover:text-[#DE141C]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.8" r=".8" fill="currentColor" stroke="none" /></svg>
                      </a>
                    ) : null}
                    {safeSocialUrl(member.linkedinUrl) ? (
                      <a href={safeSocialUrl(member.linkedinUrl)} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile" className="transition-colors hover:text-[#DE141C]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M5.2 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.5 9h3.4v11.5H3.5V9Zm5.5 0h3.3v1.6h.1a3.7 3.7 0 0 1 3.3-1.8c3.5 0 4.2 2.3 4.2 5.3v6.4h-3.4v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3v5.8H9V9Z" /></svg>
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section> : null}

      <Footer />
    </main>
  );
}
