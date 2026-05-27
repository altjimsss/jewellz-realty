"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { Poppins } from "next/font/google";
import LogoLoop from "@/components/home/LogoLoop";
import { MeetAgents } from "@/components/home/MeetAgents";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Testimonial } from "@/components/ui/design-testimonial";
import { SparkleSvg } from "@/components/ui/SparkleSvg";
import { CountUpOnView } from "@/components/ui/CountUpOnView";
import { formatPHPWhole } from "@/lib/currency";
import { useHeroCarousel } from "@/hooks/useHeroCarousel";


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

const categories = [
  {
    label: "Condo",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
        <rect x="5" y="3.5" width="14" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 7h2M13 7h2M9 10h2M13 10h2M9 13h2M13 13h2M11 20v-3h2v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "House",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
        <path d="M3 11l9-7 9 7M6 9v11h12V9M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Lot",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 11h16M10 5v14" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: "Farm",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
        <path d="M4 18h16M6 18V9l6-3 6 3v9M12 6V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 13.5h5M9.5 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Memorial",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
        <path d="M7 20h10M8 20V9a4 4 0 118 0v11M12 3v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
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
const serviceVisuals = [
  {
    title: "Property Listings & Selling Assistance",
    subtitle: "Explore verified listings and sell with expert broker guidance.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
  },
  {
    title: "Real Estate Consultation",
    subtitle: "Get tailored advice on value, timing, and smart property decisions.",
    image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80",
  },
  {
    title: "Property Viewing & Tripping Services",
    subtitle: "Schedule guided site visits to compare locations confidently.",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80",
  },
];
const hotPicks = [
  { title: "Luxury Family Home", location: "151 Tompkins Ave", beds: 4, baths: 1, area: 200, price: "$2,850", imageId: "1600596542815-ffad4c1539a9" },
  { title: "Skyper Pool Apartment", location: "88 Lakeview Dr", beds: 3, baths: 2, area: 180, price: "$2,650", imageId: "1512917774080-9991f1c4c750" },
  { title: "House on the Hollywood", location: "42 Sunset Blvd", beds: 5, baths: 3, area: 260, price: "$3,450", imageId: "1600607687939-ce8a6c25118c" },
  { title: "Gorgeous Villa Bay", location: "15 Shoreline Rd", beds: 4, baths: 3, area: 240, price: "$3,150", imageId: "1600566752355-35792bedcfea" },
  { title: "Diamond Manor Apartment", location: "11 Sapphire St", beds: 2, baths: 1, area: 120, price: "$1,950", imageId: "1600047509807-ba8f99d2cdde" },
  { title: "Comfortable Villa Green", location: "73 Garden Way", beds: 4, baths: 2, area: 210, price: "$2,980", imageId: "1505691938895-1758d7feb511" },
  { title: "Modern Loft Residence", location: "27 Midtown Ave", beds: 2, baths: 2, area: 135, price: "$2,150", imageId: "1494526585095-c41746248156" },
  { title: "Serenity Hills House", location: "9 Pinecrest Rd", beds: 3, baths: 2, area: 170, price: "$2,420", imageId: "1449844908441-8829872d2607" },
  { title: "Coastal Breeze Condo", location: "101 Seaside Blvd", beds: 2, baths: 1, area: 110, price: "$1,780", imageId: "1493809842364-78817add7ffb" },
  { title: "Prime City Penthouse", location: "66 Grand Tower", beds: 3, baths: 2, area: 190, price: "$3,980", imageId: "1464890100898-a385f744067f" },
  { title: "Elegant Mountain Home", location: "5 Summit Pass", beds: 5, baths: 4, area: 320, price: "$4,550", imageId: "1430285561322-7808604715df" },
  { title: "Parkview Starter Home", location: "230 Maple Lane", beds: 3, baths: 2, area: 145, price: "$2,090", imageId: "1513694203232-719a280e022f" },
];

export default function Page() {
  const [total, setTotal] = useState(3 * 86400 + 23 * 3600 + 19 * 60 + 56);
  const [activeCat, setActiveCat] = useState("");
  const [priceMax, setPriceMax] = useState<number>(850000);
  const [areaMax, setAreaMax] = useState<number>(170);
  const [serviceVisualIndex, setServiceVisualIndex] = useState(0);
  const [hotPicksPage, setHotPicksPage] = useState(0);
  const [hotPicksLoading, setHotPicksLoading] = useState(false);

  const safePriceMax = Math.min(Math.max(priceMax, 0), 850000);
  const priceRangeLabel = `Price (${formatPHPWhole(0)}-${formatPHPWhole(safePriceMax)})`;
  const [serviceVisualsLoaded, setServiceVisualsLoaded] = useState<boolean[]>(
    () => serviceVisuals.map(() => false)
  );
const { heroIndex, heroProgress, onPrevHero, onNextHero } = useHeroCarousel({
    heroCount: heroProperties.length,
    durationMs: HERO_DURATION_MS,
    tickMs: HERO_TICK_MS,
  });
  const serviceVisualIndexRef = useRef(0);
  const serviceVisualsLoadedRef = useRef<boolean[]>(serviceVisuals.map(() => false));
  const hotPicksTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {
    const t = setInterval(() => setTotal((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      if (hotPicksTransitionTimeoutRef.current) {
        clearTimeout(hotPicksTransitionTimeoutRef.current);
      }
    };
  }, []);


  useEffect(() => {
    serviceVisualIndexRef.current = serviceVisualIndex;
  }, [serviceVisualIndex]);

  useEffect(() => {
    serviceVisualsLoadedRef.current = serviceVisualsLoaded;
  }, [serviceVisualsLoaded]);

  useEffect(() => {
    serviceVisuals.forEach((item, idx) => {
      const img = new Image();
      img.onload = () => {
        setServiceVisualsLoaded((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
      };
      img.onerror = () => {
        setServiceVisualsLoaded((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
      };
      img.src = item.image;
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setServiceVisualIndex((prev) => {
        const next = (prev + 1) % serviceVisuals.length;
        return serviceVisualsLoadedRef.current[next] ? next : prev;
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const d = String(Math.floor(total / 86400)).padStart(2, "0");
  const h = String(Math.floor((total % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  const currentHero = heroProperties[heroIndex];

  const hotPicksPerPage = 6;
  const hotPicksPageCount = Math.ceil(hotPicks.length / hotPicksPerPage);
  const hotPicksSkeletonCount = hotPicksPerPage;
  const visibleHotPicks = hotPicks.slice(
    hotPicksPage * hotPicksPerPage,
    hotPicksPage * hotPicksPerPage + hotPicksPerPage
  );
  const changeHotPicksPage = (direction: "prev" | "next") => {
    if (hotPicksLoading) return;

    setHotPicksLoading(true);
    const nextPage =
      direction === "prev"
        ? (hotPicksPage - 1 + hotPicksPageCount) % hotPicksPageCount
        : (hotPicksPage + 1) % hotPicksPageCount;

    if (hotPicksTransitionTimeoutRef.current) {
      clearTimeout(hotPicksTransitionTimeoutRef.current);
    }

    hotPicksTransitionTimeoutRef.current = setTimeout(() => {
      setHotPicksPage(nextPage);
      setHotPicksLoading(false);
    }, 220);
  };

  return (
    <main className={`${poppins.className} bg-white text-[#181A20]`}>
      <div className="flex h-7 items-center justify-center gap-1 bg-black px-2 text-[10px] text-[#FAFAFA] sm:h-8 sm:gap-2 sm:text-sm">
        <p className="whitespace-nowrap">Premium but Affordable (deals) Properties on Sale.</p>
        <a className="underline" href="#">BrowseNow</a>
      </div>
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

      <section className="grid gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-28">
        <div className="md:hidden">
          <h2 className="mb-2 text-2xl font-semibold">Welcome to <span className="text-[#DE141C]">Jewellz Realty</span></h2>
          <p className="text-sm leading-7">
            We help buyers, sellers, and investors make confident decisions with reliable market guidance and end-to-end support.
          </p>
        </div>
        <div className="relative">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl">
            {serviceVisuals.map((visual, idx) => (
              <div
                key={visual.title}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  idx === serviceVisualIndex ? "opacity-100" : "opacity-0"
                }`}
              >
                <NextImage
                  src={visual.image}
                  alt={visual.title}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority={idx === serviceVisualIndex}
                  className={`object-cover transition-transform duration-[1400ms] ${
                    idx === serviceVisualIndex ? "scale-100" : "scale-105"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 right-24 text-white">
            <p className="text-lg font-semibold">{serviceVisuals[serviceVisualIndex].title}</p>
            <p className="mt-1 text-sm text-white/85">{serviceVisuals[serviceVisualIndex].subtitle}</p>
          </div>
        </div>
        <div>
          <h2 className="mb-3 hidden text-3xl font-semibold md:block">Welcome to <span className="text-[#DE141C]">Jewellz Realty</span></h2>
          <p className="mb-6 hidden text-sm leading-7 md:block">
            We help buyers, sellers, and investors make confident decisions with reliable market guidance and end-to-end support.
          </p>
          <div className="mb-5 flex items-start gap-4">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white transition-all duration-500 ${
                serviceVisualIndex === 0
                  ? "-translate-y-0.5 scale-110 border-[#DE141C] bg-[#DE141C] shadow-[0_8px_20px_-10px_rgba(222,20,28,0.9)]"
                  : "border-black bg-black"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M4 7.5h16M4 12h10M4 16.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16.5 14.5l1.4 1.4 2.6-2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Property Listings &amp; Selling Assistance</h3>
              <p className="text-sm leading-6">
                Browse houses, lots, condos, and farmland properties while getting guided support from licensed brokers throughout the buying or selling process.
              </p>
            </div>
          </div>
          <div className="mb-5 flex items-start gap-4">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white transition-all duration-500 ${
                serviceVisualIndex === 1
                  ? "-translate-y-0.5 scale-110 border-[#DE141C] bg-[#DE141C] shadow-[0_8px_20px_-10px_rgba(222,20,28,0.9)]"
                  : "border-black bg-black"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M4 12a8 8 0 1114.2 5l1.8 3-3.6-.7A8 8 0 014 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.5 12h7M8.5 9.5h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Real Estate Consultation</h3>
              <p className="text-sm leading-6">
                Provides personalized property recommendations, market guidance, and investment assistance tailored to each client&apos;s needs and budget.
              </p>
            </div>
          </div>
          <div className="mb-5 flex items-start gap-4">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white transition-all duration-500 ${
                serviceVisualIndex === 2
                  ? "-translate-y-0.5 scale-110 border-[#DE141C] bg-[#DE141C] shadow-[0_8px_20px_-10px_rgba(222,20,28,0.9)]"
                  : "border-black bg-black"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path d="M12 21s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Property Viewing &amp; Tripping Services</h3>
              <p className="text-sm leading-6">
                Jewellz Realty assists clients with scheduled site visits and property tours to help buyers explore different project locations before making a decision.
              </p>
            </div>
          </div>
        </div>
      </section>

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

      <section className="px-6 py-14 lg:px-24">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-10">
            <div>
              <p className="text-xs font-bold tracking-wide text-gray-500">TODAY&apos;S</p>
              <h2 className="text-3xl font-bold leading-none sm:text-4xl">HOT PICKS</h2>
              <div className="mt-2 h-[3px] w-16 bg-[#DE141C]" />
            </div>
            <div className="flex items-end gap-5">
              <div><p className="text-[10px] font-semibold uppercase text-black/70">Days</p><p className="text-3xl font-bold leading-none">{d}</p></div>
              <span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
              <div><p className="text-[10px] font-semibold uppercase text-black/70">Hours</p><p className="text-3xl font-bold leading-none">{h}</p></div>
              <span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
              <div><p className="text-[10px] font-semibold uppercase text-black/70">Minutes</p><p className="text-3xl font-bold leading-none">{m}</p></div>
              <span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
              <div><p className="text-[10px] font-semibold uppercase text-black/70">Seconds</p><p className="text-3xl font-bold leading-none">{s}</p></div>
            </div>
          </div>
          <div className="ml-auto flex items-center justify-end">
            <button
              onClick={() => changeHotPicksPage("prev")}
              disabled={hotPicksLoading}
              className="grid h-9 w-8 place-items-center border border-black/10 bg-white text-lg leading-none text-black transition-colors hover:bg-black hover:text-white"
            >
              ‹
            </button>
            <button
              onClick={() => changeHotPicksPage("next")}
              disabled={hotPicksLoading}
              className="grid h-9 w-8 place-items-center bg-[#DE141C] text-lg leading-none text-white"
            >
              ›
            </button>
            <button className="h-9 bg-black px-5 text-xs font-semibold text-white">View All</button>
          </div>
        </div>
        <div className={`grid grid-cols-2 gap-3 transition-opacity duration-300 sm:gap-5 md:grid-cols-3 ${hotPicksLoading ? "opacity-80" : "opacity-100"}`}>
          {hotPicksLoading ? Array.from({ length: hotPicksSkeletonCount }).map((_, idx) => (
            <article key={`hotpick-skeleton-${idx}`} className="overflow-hidden bg-white shadow-sm">
              <div className="h-32 animate-pulse bg-[#E7E7E7] sm:h-44" />
              <div className="flex h-[118px] flex-col bg-[#F4F4F4] p-2.5 sm:h-[158px] sm:p-3.5">
                <div className="h-4 w-[88%] animate-pulse rounded bg-[#DFDFDF] sm:h-5" />
                <div className="mt-1 h-4 w-[62%] animate-pulse rounded bg-[#E5E5E5]" />
                <div className="mt-auto flex items-end justify-between gap-2 pt-1.5 sm:gap-4 sm:pt-3">
                  <div className="h-4 w-20 animate-pulse rounded bg-[#DCDCDC] sm:w-28" />
                  <div className="h-6 w-12 animate-pulse rounded bg-[#CFCFCF] sm:h-9 sm:w-20" />
                </div>
              </div>
            </article>
          )) : visibleHotPicks.map((pick) => (
            <article key={pick.title} className="group overflow-hidden bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="h-32 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.04] sm:h-44" style={{ backgroundImage: `url('https://images.unsplash.com/photo-${pick.imageId}?w=700&q=80')` }} />
              <div className="flex h-[118px] flex-col bg-[#F4F4F4] p-2.5 sm:h-[158px] sm:p-3.5">
                <h3 className="line-clamp-2 min-h-[34px] text-[14px] font-semibold leading-tight text-[#181A20] transition-colors duration-300 group-hover:text-[#DE141C] sm:min-h-[44px] sm:text-[18px]">{pick.title}</h3>
                <p className="mt-1 text-[11px] text-gray-500 sm:text-[13px]">{pick.location}</p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-1.5 sm:gap-4 sm:pt-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#1F2328] sm:gap-3 sm:text-[13px]">
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-black/75 sm:h-3.5 sm:w-3.5" fill="none" aria-hidden="true">
                        <path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {pick.beds}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-black/75 sm:h-3.5 sm:w-3.5" fill="none" aria-hidden="true">
                        <path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {pick.baths}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-black/75 sm:h-3.5 sm:w-3.5" fill="none" aria-hidden="true">
                        <rect x="3.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
                        <rect x="13.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
                        <rect x="3.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
                        <rect x="13.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                      {pick.area}
                    </span>
                  </div>
                  <p className="ml-1 inline-flex h-6 shrink-0 items-center bg-[#11141C] px-2 text-[10px] font-semibold text-white sm:ml-3 sm:h-9 sm:px-4 sm:text-[15px]">{pick.price}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y px-4 py-12 sm:px-6 sm:py-16 lg:px-28">
        <p className="text-center text-sm font-bold text-gray-500">FIND YOUR WAY EASIER</p>
        <h2 className="text-center text-3xl font-bold sm:text-4xl">BROWSE CATEGORIES</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 md:grid-cols-5">
          {categories.map((c) => (
            <button
              key={c.label}
              onClick={() => setActiveCat(c.label)}
              className={`group flex h-24 flex-col items-center justify-center gap-1.5 rounded border transition-all duration-200 sm:h-36 sm:gap-2 ${
                c.label === "Memorial" ? "col-span-2 mx-auto w-[48%] sm:col-span-1 sm:w-full" : ""
              } ${
                activeCat === c.label
                  ? "border-[#DE141C] bg-[#DE141C] text-white"
                  : "border-black/10 bg-white text-black hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white"
              }`}
            >
              <span className="scale-90 sm:scale-100">{c.icon}</span>
              <span className="text-xs font-semibold sm:text-sm">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

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


