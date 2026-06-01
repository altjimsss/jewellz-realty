"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Poppins } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Testimonial } from "@/components/ui/design-testimonial";
import { SparkleSvg } from "@/components/ui/SparkleSvg";
import { CountUpOnView } from "@/components/ui/CountUpOnView";
import { formatPHPWhole } from "@/lib/currency";
import { useHeroCarousel } from "@/hooks/useHeroCarousel";
import { ServiceShowcase } from "@/components/home/ServiceShowcase";
const HomeDiscoverySection = dynamic(() => import("@/components/home/HomeDiscoverySection"), { ssr: false });

const LogoLoop = dynamic(() => import("@/components/home/LogoLoop"), { ssr: false });
const MeetAgents = dynamic(() => import("@/components/home/MeetAgents").then((module) => module.MeetAgents), {
  ssr: false,
});


const developerLogos = [
  {
    title: "ECHOMES",
    node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">ECHOMES</span>,
  },
  {
    title: "DMCI",
    node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">DMCI</span>,
  },
  {
    title: "AXEIA",
    node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">AXEIA</span>,
  },
  {
    title: "OVIALAND",
    node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">OVIALAND</span>,
  },
  {
    title: "AboitizLand",
    node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">AboitizLand</span>,
  },
  {
    title: "PHIRST",
    node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">PHIRST</span>,
  },
  {
    title: "NEXTA",
    node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">NEXTA</span>,
  },
];

const heroProperties = [
  {
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
    title: "PREMIUM HOMES MOUNTAIN VILLA",
    price: 2000000000,
    status: "Sale",
    location: "San Pascual, Batangas",
    area: "3200 SQ FT.",
    bedroom: 8,
    bathroom: 3,
    garage: 2,
  },
  {
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
    title: "SKYPER POOL APARTMENT",
    price: 1350000000,
    status: "Featured",
    location: "Tagaytay, Cavite",
    area: "2400 SQ FT.",
    bedroom: 6,
    bathroom: 4,
    garage: 2,
  },
  {
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
    title: "DIAMOND MANOR ESTATE",
    price: 980000000,
    status: "New",
    location: "Nuvali, Laguna",
    area: "2800 SQ FT.",
    bedroom: 5,
    bathroom: 3,
    garage: 3,
  },
];
const HERO_DURATION_MS = 5000;
const HERO_TICK_MS = 50;
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });
const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];
export default function Page() {
  const [total, setTotal] = useState(3 * 86400 + 23 * 3600 + 19 * 60 + 56);
  const [priceMax, setPriceMax] = useState(850000);
  const [areaMax, setAreaMax] = useState(170);

  const safePriceMax = Math.min(Math.max(priceMax, 0), 850000);
  const priceRangeLabel = `Price (${formatPHPWhole(0)}-${formatPHPWhole(safePriceMax)})`;

const { heroIndex, heroProgress, onPrevHero, onNextHero } = useHeroCarousel({
    heroCount: heroProperties.length,
    durationMs: HERO_DURATION_MS,
    tickMs: HERO_TICK_MS,
  });



  useEffect(() => {
    const t = setInterval(() => setTotal((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const d = String(Math.floor(total / 86400)).padStart(2, "0");
  const h = String(Math.floor((total % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  const currentHero = heroProperties[heroIndex];

  return (
    <main className={`${poppins.className} bg-white text-[#181A20]`}>
      <AnnouncementBar />
      <Navbar links={navLinks} fontClassName={poppins.className} />

      <section className="relative overflow-hidden bg-black md:h-[520px]">
        <div className="absolute right-0 top-0 hidden h-full w-[70%] z-0 bg-cover bg-center transition-all duration-700 md:block" style={{ backgroundImage: `url('${currentHero.image}')` }} />
        <div className="absolute inset-y-0 left-0 hidden w-[34%] bg-gradient-to-r from-black/85 via-black/45 to-transparent md:block" />
        <div className="absolute bottom-0 right-0 hidden h-[5px] w-[70%] overflow-hidden rounded bg-white/25 md:block">
          <div className="h-full bg-[#DE141C] transition-[width] duration-75 ease-linear" style={{ width: `${heroProgress}%` }} />
        </div>
        <div className="absolute bottom-8 left-[35%] z-20 hidden w-[36%] md:block">
          <div className="mb-0 relative inline-flex overflow-hidden">
            <button
              onClick={() => {
                onPrevHero();
              }}
              className="grid h-9 w-10 place-items-center bg-[#DE141C] text-2xl leading-none text-white"
            >
              &lsaquo;
            </button>
            <button
              onClick={onNextHero}
              className="grid h-9 w-10 place-items-center bg-white text-2xl leading-none text-[#DE141C]"
            >
              &rsaquo;
            </button>
          </div>
          <div className="bg-black/70 px-3.5 py-2.5 text-white">
            <h3 className="text-[28px] leading-tight font-bold">{currentHero.title}</h3>
            <div className="mt-1.5 flex items-center gap-3 text-[12px]">
              <p className="font-semibold">{currentHero.price}</p>
              <span className="rounded bg-[#DE141C] px-2 py-0.5 text-[10px] font-bold">{currentHero.status}</span>
              <p className="flex items-center gap-1 text-[11px] text-white/85">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#DE141C]" fill="none" aria-hidden="true">
                  <path d="M12 21s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="10" r="2.2" fill="currentColor" />
                </svg>
                {currentHero.location}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 bg-white px-3 py-2 text-[#1F2328]">
            <div className="flex items-center gap-2 border-r border-black/10 pr-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" fill="currentColor" />
                <rect x="14" y="3" width="7" height="7" fill="currentColor" />
                <rect x="3" y="14" width="7" height="7" fill="currentColor" />
                <rect x="14" y="14" width="7" height="7" fill="currentColor" />
              </svg>
              <div><p className="text-[11px] font-bold">{currentHero.area}</p><p className="text-[10px] text-black/60">Area</p></div>
            </div>
            <div className="flex items-center gap-2 border-r border-black/10 px-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
                <path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div><p className="text-[11px] font-bold">{currentHero.bedroom}</p><p className="text-[10px] text-black/60">Bedroom</p></div>
            </div>
            <div className="flex items-center gap-2 border-r border-black/10 px-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
                <path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div><p className="text-[11px] font-bold">{currentHero.bathroom}</p><p className="text-[10px] text-black/60">Bathroom</p></div>
            </div>
            <div className="flex items-center gap-2 pl-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
                <path d="M3 11l9-7 9 7M6 9v11h12V9M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div><p className="text-[11px] font-bold">{currentHero.garage}</p><p className="text-[10px] text-black/60">Garage</p></div>
            </div>
          </div>
        </div>

        <div className="absolute left-10 top-12 hidden h-28 w-[3px] bg-[#DE141C] md:block" />
        <div className="absolute left-14 top-11 hidden items-start gap-4 md:flex">
          <div>
            <p className="font-bold text-[#7F7F7F]">DISCOVER YOUR</p>
            <h1 className="text-5xl font-bold leading-[0.92] text-white">DREAM<br />PROPERTY</h1>
          </div>
          <SparkleSvg className="mt-1 h-auto w-[120px] shrink-0" />
        </div>

        <div className="absolute left-10 top-52 hidden w-[370px] md:block">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="relative">
              <select className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-3.5 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C]">
                <option value="">Location</option>
                <option value="batangas">Batangas</option>
                <option value="cavite">Cavite</option>
                <option value="laguna">Laguna</option>
                <option value="quezon-city">Quezon City</option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/90"
                fill="none"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="relative">
              <select className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-3.5 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C]">
                <option value="">Sub-Location</option>
                <option value="lipa">Lipa</option>
                <option value="nuvali">Nuvali</option>
                <option value="tagaytay">Tagaytay</option>
                <option value="alabang">Alabang</option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/90"
                fill="none"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="relative">
              <select className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-3.5 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C]">
                <option value="">No. of Bathrooms</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4+</option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/90"
                fill="none"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="relative">
              <select className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-3.5 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C]">
                <option value="">Status</option>
                <option value="for-sale">For Sale</option>
                <option value="pre-selling">Pre-Selling</option>
                <option value="ready">Ready for Occupancy</option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/90"
                fill="none"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="relative">
              <select className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-3.5 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C]">
                <option value="">No. of Guest</option>
                <option value="1-2">1-2</option>
                <option value="3-4">3-4</option>
                <option value="5-6">5-6</option>
                <option value="7+">7+</option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/90"
                fill="none"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="relative">
              <select className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-3.5 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C]">
                <option value="">No. of Bedrooms</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4+</option>
              </select>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/90"
                fill="none"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3.5">
            <div>
              <p className="mb-1 text-[11px] text-[#8B8B8B]">{priceRangeLabel}</p>
              <input
                className="h-1.5 w-full accent-[#DE141C]"
                type="range"
                min="0"
                max="850000"
                step="10000"
                value={safePriceMax}
                onChange={(e) => setPriceMax(Math.min(Number(e.target.value) || 0, 850000))}
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-[#8B8B8B]">Area (120-{areaMax})</p>
              <input
                className="h-1.5 w-full accent-[#DE141C]"
                type="range"
                min="120"
                max="500"
                step="1"
                value={areaMax ?? 120}
                onChange={(e) => setAreaMax(Number(e.target.value) || 120)}
              />
            </div>
          </div>
                    <button className="mx-auto mt-5 block h-10 w-[170px] rounded bg-[#DE141C] text-xs font-bold text-white">Search Property</button>
        </div>

        <div className="md:hidden">
          <div className="px-4 pb-6 pt-8">
            <div className="flex items-stretch gap-2">
              <span className="w-[3px] bg-[#DE141C]" />
              <div className="relative">
                <div>
                <p className="text-[10px] font-bold leading-none tracking-[0.08em] text-[#5F5F63]">DISCOVER YOUR</p>
                <h1 className="mt-1 text-[40px] font-bold leading-[0.95] text-white">DREAM<br />PROPERTY</h1>
                </div>
                <SparkleSvg showExtra className="pointer-events-none absolute -right-[145px] top-1 h-auto w-[132px]" />
              </div>
            </div>
          </div>
          <div className="relative h-[300px] w-full overflow-hidden">
            {heroProperties.map((hero, idx) => (
              <div
                key={`mobile-hero-${hero.title}`}
                className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out ${
                  idx === heroIndex ? "scale-100 opacity-100" : "scale-105 opacity-0"
                }`}
                style={{ backgroundImage: `url('${hero.image}')` }}
              />
            ))}
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <div className="relative inline-flex overflow-hidden">
                <button onClick={onPrevHero} className="grid h-10 w-10 place-items-center bg-[#DE141C] text-2xl leading-none text-white">&lsaquo;</button>
                <button onClick={onNextHero} className="grid h-10 w-10 place-items-center bg-white text-2xl leading-none text-[#DE141C]">&rsaquo;</button>
              </div>
              <div className="bg-black/75 px-3 py-2 text-white">
                <h3 className="text-[24px] font-bold leading-[0.95]">{currentHero.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <p className="font-semibold">{currentHero.price}</p>
                  <span className="rounded bg-[#DE141C] px-2 py-0.5 text-[10px] font-bold">{currentHero.status}</span>
                  <p className="flex items-center gap-1 text-white/85">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#DE141C]" fill="none" aria-hidden="true"><path d="M12 21s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="10" r="2.2" fill="currentColor" /></svg>
                    {currentHero.location}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 bg-white px-2 py-2 text-[#1F2328]">
                <div className="flex items-center gap-1 border-r border-black/10 pr-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" fill="currentColor" />
                    <rect x="14" y="3" width="7" height="7" fill="currentColor" />
                    <rect x="3" y="14" width="7" height="7" fill="currentColor" />
                    <rect x="14" y="14" width="7" height="7" fill="currentColor" />
                  </svg>
                  <div><p className="text-[9px] font-bold">{currentHero.area}</p><p className="text-[9px] text-black/60">Area</p></div>
                </div>
                <div className="flex items-center gap-1 border-r border-black/10 px-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none" aria-hidden="true">
                    <path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div><p className="text-[9px] font-bold">{currentHero.bedroom}</p><p className="text-[9px] text-black/60">Bedroom</p></div>
                </div>
                <div className="flex items-center gap-1 border-r border-black/10 px-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none" aria-hidden="true">
                    <path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div><p className="text-[9px] font-bold">{currentHero.bathroom}</p><p className="text-[9px] text-black/60">Bathroom</p></div>
                </div>
                <div className="flex items-center gap-1 pl-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none" aria-hidden="true">
                    <path d="M3 11l9-7 9 7M6 9v11h12V9M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div><p className="text-[9px] font-bold">{currentHero.garage}</p><p className="text-[9px] text-black/60">Garage</p></div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[5px] overflow-hidden rounded bg-white/25">
              <div className="h-full bg-[#DE141C] transition-[width] duration-75 ease-linear" style={{ width: `${heroProgress}%` }} />
            </div>
          </div>
          <div className="space-y-2 bg-black px-[15px] pb-[15px] pt-5">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select className="h-10 w-full appearance-none rounded-sm border border-white/20 bg-[#2A2A2A]/85 px-2.5 pr-6 text-xs text-[#D0D0D0] outline-none focus:border-[#DE141C]">
                  <option value="">Location</option>
                  <option value="batangas">Batangas</option>
                  <option value="cavite">Cavite</option>
                  <option value="laguna">Laguna</option>
                </select>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/80" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="relative">
                <select className="h-10 w-full appearance-none rounded-sm border border-white/20 bg-[#2A2A2A]/85 px-2.5 pr-6 text-xs text-[#D0D0D0] outline-none focus:border-[#DE141C]">
                  <option value="">Sub-Location</option>
                  <option value="lipa">Lipa</option>
                  <option value="nuvali">Nuvali</option>
                  <option value="tagaytay">Tagaytay</option>
                </select>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/80" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="relative">
                <select className="h-10 w-full appearance-none rounded-sm border border-white/20 bg-[#2A2A2A]/85 px-2.5 pr-6 text-xs text-[#D0D0D0] outline-none focus:border-[#DE141C]">
                  <option value="">No. of Bathrooms</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/80" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="relative">
                <select className="h-10 w-full appearance-none rounded-sm border border-white/20 bg-[#2A2A2A]/85 px-2.5 pr-6 text-xs text-[#D0D0D0] outline-none focus:border-[#DE141C]">
                  <option value="">Status</option>
                  <option value="for-sale">For Sale</option>
                  <option value="pre-selling">Pre-Selling</option>
                  <option value="ready">Ready for Occupancy</option>
                </select>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/80" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="relative">
                <select className="h-10 w-full appearance-none rounded-sm border border-white/20 bg-[#2A2A2A]/85 px-2.5 pr-6 text-xs text-[#D0D0D0] outline-none focus:border-[#DE141C]">
                  <option value="">No. of Guest</option>
                  <option value="1-2">1-2</option>
                  <option value="3-4">3-4</option>
                  <option value="5-6">5-6</option>
                  <option value="7+">7+</option>
                </select>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/80" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="relative">
                <select className="h-10 w-full appearance-none rounded-sm border border-white/20 bg-[#2A2A2A]/85 px-2.5 pr-6 text-xs text-[#D0D0D0] outline-none focus:border-[#DE141C]">
                  <option value="">No. of Bedrooms</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/80" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <p className="mb-1 text-[10px] text-white/60">{priceRangeLabel}</p>
                <input
                  className="h-1.5 w-full accent-[#DE141C]"
                  type="range"
                  min="0"
                  max="850000"
                  step="10000"
                  value={safePriceMax}
                  onChange={(e) => setPriceMax(Math.min(Number(e.target.value) || 0, 850000))}
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] text-white/60">Area (120-{areaMax})</p>
                <input
                  className="h-1.5 w-full accent-[#DE141C]"
                  type="range"
                  min="120"
                  max="500"
                  step="1"
                  value={areaMax ?? 120}
                  onChange={(e) => setAreaMax(Number(e.target.value) || 120)}
                />
              </div>
            </div>
            <button className="mt-1 h-10 w-full rounded-sm bg-[#DE141C] text-xs font-semibold text-white">
              Search Property
            </button>
          </div>
        </div>
      </section>

      <ServiceShowcase />

      <div className="grid grid-cols-3 border-y py-4 text-center">
        <div className="flex flex-col items-center justify-center"><p className="text-2xl font-semibold sm:text-4xl"><CountUpOnView end={500} /><span className="text-[#DE141C]">+</span></p><p className="text-[11px] sm:text-sm">Properties</p></div>
        <div className="flex flex-col items-center justify-center"><p className="text-2xl font-semibold sm:text-4xl"><CountUpOnView end={50} /><span className="text-[#DE141C]">+</span></p><p className="text-[11px] sm:text-sm">Agents</p></div>
        <div className="flex flex-col items-center justify-center"><p className="text-2xl font-semibold sm:text-4xl"><CountUpOnView end={10} /><span className="text-[#DE141C]">+</span></p><p className="text-[11px] sm:text-sm">Provinces</p></div>
      </div>

      <section className="border-b py-10">
        <LogoLoop
          logos={developerLogos}
          speed={80}
          direction="left"
          logoHeight={36}
          gap={20}
          hoverSpeed={0}
          scaleOnHover
          fadeOut
          fadeOutColor="#ffffff"
          ariaLabel="Developer partners"
        />
      </section>

      <HomeDiscoverySection />

      <MeetAgents />

      <section className="border-y px-4 py-12 text-center sm:px-6 sm:py-16">
        <p className="text-sm font-bold text-gray-500">WHAT OUR CLIENTS SAY</p>
        <h2 className="text-3xl font-bold sm:text-4xl">TESTIMONIALS</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="mt-8">
          <Testimonial />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-28">
        <p className="text-center text-sm font-bold text-gray-500">KNOW US BETTER</p>
        <h2 className="text-center text-3xl font-bold sm:text-4xl">BROWSE OUR GALLERY</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="mt-8 grid grid-cols-3 gap-2">
          <div className="group relative h-[22rem] overflow-hidden sm:h-[26rem] lg:h-[30rem]">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=800&q=80')" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
            <div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-5 sm:left-5 sm:gap-3">
              <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold leading-[0.95] sm:text-4xl lg:text-5xl">ACHIEVEMENTS</p>
                <p className="mt-1 text-[7px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-xs lg:text-sm">SEE OUR MILESTONES</p>
              </div>
            </div>
          </div>
          <div className="col-span-2 space-y-2">
            <div className="group relative h-[10.75rem] overflow-hidden sm:h-[12.5rem] lg:h-[14.75rem]">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80')" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
              <div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-4 sm:left-5 sm:gap-3">
                <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-[0.95] sm:text-4xl lg:text-5xl">EVENTS</p>
                  <p className="mt-1 text-[7px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-xs lg:text-sm">MEMORABLE TIMES</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="group relative h-[10.75rem] overflow-hidden sm:h-[12.5rem] lg:h-[14.75rem]">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&q=80')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
                <div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-4 sm:left-4 sm:gap-3">
                  <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold leading-[0.95] sm:text-4xl lg:text-5xl">TRAININGS</p>
                    <p className="mt-1 text-[7px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-xs lg:text-sm">ENHANCING OUR SKILLS</p>
                  </div>
                </div>
              </div>
              <div className="group relative h-[10.75rem] overflow-hidden sm:h-[12.5rem] lg:h-[14.75rem]">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&q=80')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
                <div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-4 sm:left-4 sm:gap-3">
                  <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold leading-[0.95] sm:text-4xl lg:text-5xl">SERVICE</p>
                    <p className="mt-1 text-[7px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-xs lg:text-sm">FOR THE PEOPLE</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}


