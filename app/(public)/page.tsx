"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Poppins } from "next/font/google";
import LogoLoop from "@/components/home/LogoLoop";
import { Testimonial } from "@/components/ui/design-testimonial";

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
    price: "â‚±2,000,000,000.00",
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
    price: "â‚±1,350,000,000.00",
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
    price: "â‚±980,000,000.00",
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

function CountUpOnView({ end, duration = 2200 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setHasAnimated(true);

        const start = performance.now();
        const frame = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setCount(Math.round(progress * end));
          if (progress < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        observer.disconnect();
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [duration, end, hasAnimated]);

  return <span ref={ref}>{count}</span>;
}

export default function Page() {
  const pathname = usePathname();
  const [total, setTotal] = useState(3 * 86400 + 23 * 3600 + 19 * 60 + 56);
  const [activeCat, setActiveCat] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroElapsed, setHeroElapsed] = useState(0);
  const [priceMax, setPriceMax] = useState<number>(850000);
  const [areaMax, setAreaMax] = useState<number>(170);
  const [serviceVisualIndex, setServiceVisualIndex] = useState(0);
  const [hotPicksPage, setHotPicksPage] = useState(0);
  const [agentsMarqueeDuration, setAgentsMarqueeDuration] = useState(28);
  const [agentsMarqueeDirection, setAgentsMarqueeDirection] = useState<"normal" | "reverse">("normal");
  const [serviceVisualsLoaded, setServiceVisualsLoaded] = useState<boolean[]>(
    () => serviceVisuals.map(() => false)
  );
  const serviceVisualIndexRef = useRef(0);
  const serviceVisualsLoadedRef = useRef<boolean[]>(serviceVisuals.map(() => false));
  const agentsSpeedResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTotal((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    return () => {
      if (agentsSpeedResetTimeoutRef.current) {
        clearTimeout(agentsSpeedResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setHeroElapsed((prev) => {
        const next = prev + HERO_TICK_MS;
        if (next >= HERO_DURATION_MS) {
          setHeroIndex((i) => (i + 1) % heroProperties.length);
          return 0;
        }
        return next;
      });
    }, HERO_TICK_MS);
    return () => clearInterval(t);
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
  const heroProgress = (heroElapsed / HERO_DURATION_MS) * 100;
  const currentHero = heroProperties[heroIndex];
  const formatCurrency = (value: number) => `â‚±${value.toLocaleString("en-PH")}`;
  const hotPicksPerPage = 6;
  const hotPicksPageCount = Math.ceil(hotPicks.length / hotPicksPerPage);
  const visibleHotPicks = hotPicks.slice(
    hotPicksPage * hotPicksPerPage,
    hotPicksPage * hotPicksPerPage + hotPicksPerPage
  );
  const boostAgentsMarquee = (direction: "normal" | "reverse") => {
    setAgentsMarqueeDirection(direction);
    setAgentsMarqueeDuration(10);

    if (agentsSpeedResetTimeoutRef.current) {
      clearTimeout(agentsSpeedResetTimeoutRef.current);
    }

    agentsSpeedResetTimeoutRef.current = setTimeout(() => {
      setAgentsMarqueeDuration(28);
    }, 1800);
  };

  return (
    <main className={`${poppins.className} bg-white text-[#181A20]`}>
      <div className="flex h-8 items-center justify-center gap-2 bg-black text-sm text-[#FAFAFA]">
        <p>Premium but Affordable (deals) Properties on Sale.</p>
        <a className="underline" href="#">BrowseNow</a>
      </div>

      <nav className="sticky top-0 z-50 border-b border-black/10 bg-white px-6 py-3 lg:px-12">
        <div className="mx-auto flex max-w-[1200px] items-center">
          <div className="flex min-w-[170px] items-center">
            <img src="/assets/jewellz-logo.png" alt="Jewellz Realty Logo" className="h-14 w-auto object-contain" />
          </div>
          <div className={`ml-28 hidden items-center gap-8 text-sm md:flex ${poppins.className}`}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`group relative pb-2 font-medium transition-colors duration-200 ${
                    isActive ? "text-black" : "text-black/70 hover:text-black"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                  <span
                    className={`absolute bottom-0 left-0 h-[2px] rounded-full bg-[#DE141C] transition-all duration-200 ${
                      isActive ? "w-full opacity-100" : "w-0 opacity-0 group-hover:w-full group-hover:opacity-60"
                    }`}
                  />
                </a>
              );
            })}
          </div>
          <div className="ml-auto hidden md:block">
            <label className="relative block">
              <input
                type="search"
                placeholder="What are you looking for?"
                className="h-9 w-[240px] rounded-sm border border-black/10 bg-white pl-4 pr-9 text-xs text-black placeholder:text-black/40 outline-none"
              />
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </label>
          </div>
        </div>
      </nav>

      <section className="relative h-[520px] overflow-hidden bg-black">
        <div className="absolute right-0 top-0 h-full w-[70%] z-0 bg-cover bg-center transition-all duration-700" style={{ backgroundImage: `url('${currentHero.image}')` }} />
        <div className="absolute inset-y-0 left-0 w-[34%] bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
        <div className="absolute bottom-0 right-0 h-[5px] w-[70%] overflow-hidden rounded bg-white/25">
          <div className="h-full bg-[#DE141C] transition-[width] duration-75 ease-linear" style={{ width: `${heroProgress}%` }} />
        </div>
        <div className="absolute bottom-8 left-[35%] z-20 w-[36%]">
          <div className="mb-0 relative inline-flex overflow-hidden">
            <button
              onClick={() => {
                setHeroIndex((i) => (i - 1 + heroProperties.length) % heroProperties.length);
                setHeroElapsed(0);
              }}
              className="grid h-9 w-10 place-items-center bg-[#DE141C] text-2xl leading-none text-white"
            >
              &lsaquo;
            </button>
            <button
              onClick={() => {
                setHeroIndex((i) => (i + 1) % heroProperties.length);
                setHeroElapsed(0);
              }}
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

        <div className="absolute left-10 top-12 h-28 w-[3px] bg-[#DE141C]" />
        <div className="absolute left-14 top-11">
          <p className="font-bold text-[#7F7F7F]">DISCOVER YOUR</p>
          <h1 className="text-5xl font-bold leading-[0.92] text-white">DREAM<br />PROPERTY</h1>
        </div>

        <div className="absolute left-10 top-52 w-[370px]">
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
              <p className="mb-1 text-[11px] text-[#8B8B8B]">Price (0-{formatCurrency(priceMax)})</p>
              <input
                className="h-1.5 w-full accent-[#DE141C]"
                type="range"
                min="0"
                max="2000000"
                step="10000"
                value={priceMax ?? 0}
                onChange={(e) => setPriceMax(Number(e.target.value) || 0)}
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
      </section>

      <section className="grid gap-8 px-6 py-16 lg:grid-cols-2 lg:px-28">
        <div className="relative">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl">
            {serviceVisuals.map((visual, idx) => (
              <div
                key={visual.title}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  idx === serviceVisualIndex ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={visual.image}
                  alt={visual.title}
                  className={`h-full w-full object-cover transition-transform duration-[1400ms] ${
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
          <h2 className="mb-3 text-3xl font-semibold">Welcome to Jewellz Realty</h2>
          <p className="mb-6 text-sm leading-7">
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

      <div className="grid border-y py-8 text-center md:grid-cols-3">
        <div><p className="text-4xl font-semibold"><CountUpOnView end={500} /><span className="text-[#DE141C]">+</span></p><p className="text-sm">Properties</p></div>
        <div><p className="text-4xl font-semibold"><CountUpOnView end={50} /><span className="text-[#DE141C]">+</span></p><p className="text-sm">Agents</p></div>
        <div><p className="text-4xl font-semibold"><CountUpOnView end={10} /><span className="text-[#DE141C]">+</span></p><p className="text-sm">Provinces</p></div>
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
          <div className="flex flex-wrap items-center gap-10">
            <div>
              <p className="text-xs font-bold tracking-wide text-gray-500">TODAY&apos;S</p>
              <h2 className="text-4xl font-bold leading-none">HOT PICKS</h2>
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
          <div className="flex items-center">
            <button
              onClick={() => setHotPicksPage((p) => (p - 1 + hotPicksPageCount) % hotPicksPageCount)}
              className="grid h-9 w-8 place-items-center border border-black/10 bg-white text-lg leading-none text-black transition-colors hover:bg-black hover:text-white"
            >
              ‹
            </button>
            <button
              onClick={() => setHotPicksPage((p) => (p + 1) % hotPicksPageCount)}
              className="grid h-9 w-8 place-items-center bg-[#DE141C] text-lg leading-none text-white"
            >
              ›
            </button>
            <button className="h-9 bg-black px-5 text-xs font-semibold text-white">View All</button>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {visibleHotPicks.map((pick) => (
            <article key={pick.title} className="group overflow-hidden bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="h-44 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.04]" style={{ backgroundImage: `url('https://images.unsplash.com/photo-${pick.imageId}?w=700&q=80')` }} />
              <div className="bg-[#F4F4F4] p-3.5">
                <h3 className="text-[18px] font-semibold leading-tight text-[#181A20] transition-colors duration-300 group-hover:text-[#DE141C]">{pick.title}</h3>
                <p className="mt-1 text-[13px] text-gray-500">{pick.location}</p>
                <div className="mt-3 flex items-end justify-between">
                  <div className="flex items-center gap-3 text-[13px] text-[#1F2328]">
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-black/75" fill="none" aria-hidden="true">
                        <path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {pick.beds}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-black/75" fill="none" aria-hidden="true">
                        <path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {pick.baths}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-black/75" fill="none" aria-hidden="true">
                        <rect x="3.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
                        <rect x="13.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
                        <rect x="3.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
                        <rect x="13.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                      {pick.area}
                    </span>
                  </div>
                  <p className="inline-flex h-9 items-center bg-[#11141C] px-4 text-[15px] font-semibold text-white">{pick.price}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y px-6 py-16 lg:px-28">
        <p className="text-center text-sm font-bold text-gray-500">FIND YOUR WAY EASIER</p>
        <h2 className="text-center text-4xl font-bold">BROWSE CATEGORIES</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5">
          {categories.map((c) => (
            <button
              key={c.label}
              onClick={() => setActiveCat(c.label)}
              className={`group flex h-36 flex-col items-center justify-center gap-2 rounded border transition-all duration-200 ${
                activeCat === c.label
                  ? "border-[#DE141C] bg-[#DE141C] text-white"
                  : "border-black/10 bg-white text-black hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white"
              }`}
            >
              <span>{c.icon}</span>
              <span className="text-sm font-semibold">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 py-16 lg:px-24">
        <p className="text-center text-sm font-bold text-gray-500">WE HAVE PROFESSIONAL AGENTS</p>
        <h2 className="text-center text-4xl font-bold">MEET OUR AGENTS</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="relative mt-10">
          <button
            type="button"
            aria-label="Previous agents"
            onClick={() => boostAgentsMarquee("reverse")}
            className="absolute left-0 top-1/2 z-20 grid h-10 w-9 -translate-y-1/2 place-items-center border border-black/10 bg-white text-lg leading-none text-black transition-colors hover:bg-black hover:text-white"
          >
            &lsaquo;
          </button>
          <button
            type="button"
            aria-label="Next agents"
            onClick={() => boostAgentsMarquee("normal")}
            className="absolute right-0 top-1/2 z-20 grid h-10 w-9 -translate-y-1/2 place-items-center bg-[#DE141C] text-lg leading-none text-white"
          >
            &rsaquo;
          </button>
          <div className="mx-12 overflow-hidden">
            <div
              className="flex w-max animate-[agents-marquee_28s_linear_infinite] gap-6 hover:[animation-play-state:paused]"
              style={{
                animationDuration: `${agentsMarqueeDuration}s`,
                animationDirection: agentsMarqueeDirection,
              }}
            >
              {[...[
                { name: "CINDY HERMOSO", top: true },
                { name: "JOHN A. SMITH", top: false },
                { name: "LINDA WALKER", top: false },
                { name: "EVAN YU", top: false },
              ], ...[
                { name: "CINDY HERMOSO", top: true },
                { name: "JOHN A. SMITH", top: false },
                { name: "LINDA WALKER", top: false },
                { name: "EVAN YU", top: false },
              ]].map((agent, idx) => (
                <article key={`${agent.name}-${idx}`} className="w-[280px] shrink-0 overflow-hidden rounded-sm border border-black/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className={`relative h-60 ${idx % 2 === 0 ? "bg-[#DE141C]" : "bg-white"}`}>
                    {agent.top && (
                      <span className="absolute right-3 top-3 z-10 rounded-md bg-black px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-white">TOP AGENT</span>
                    )}
                    <img src="/assets/broker.png" alt={agent.name} className="h-full w-full object-contain object-bottom transition-transform duration-300 group-hover:scale-[1.02]" />
                  </div>
                  <div className="bg-[#2A2A2A] px-3 py-3 text-center text-white">
                    <p className="truncate whitespace-nowrap text-[28px] font-bold uppercase leading-none tracking-[0.02em]">{agent.name}</p>
                    <p className="mt-1 text-[15px] font-medium text-gray-200">Real Estate Broker</p>
                    <div className="mx-auto mt-2 h-px w-20 bg-white/20" />
                    <p className="mt-2 text-[11px] font-medium text-gray-300">PRC No. 24444</p>
                    <p className="text-[11px] font-medium text-gray-300">DHSUD No. 6186</p>
                  </div>
                  <div className={`px-3 py-2.5 ${idx % 2 === 0 ? "bg-[#DE141C]" : "bg-white"}`}>
                    <div className={`flex items-center justify-center gap-3 ${idx % 2 === 0 ? "text-white" : "text-[#DE141C]"}`}>
                      <button className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${idx % 2 === 0 ? "bg-white/10 hover:bg-white/20" : "bg-[#DE141C]/10 hover:bg-[#DE141C]/20"}`} aria-label="Facebook"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M13 10h3V7h-3V5c0-.8.2-1.1 1-1.1H16V1h-3c-2.5 0-4 1.5-4 4.2V7H7v3h2v9h4v-9z" /></svg></button>
                      <button className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${idx % 2 === 0 ? "bg-white/10 hover:bg-white/20" : "bg-[#DE141C]/10 hover:bg-[#DE141C]/20"}`} aria-label="Instagram"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M7.8 2h8.4A5.8 5.8 0 0122 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8A5.8 5.8 0 012 16.2V7.8A5.8 5.8 0 017.8 2zm0 2A3.8 3.8 0 004 7.8v8.4A3.8 3.8 0 007.8 20h8.4a3.8 3.8 0 003.8-3.8V7.8A3.8 3.8 0 0016.2 4H7.8zm9.6 1.3a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z" /></svg></button>
                      <button className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${idx % 2 === 0 ? "bg-white/10 hover:bg-white/20" : "bg-[#DE141C]/10 hover:bg-[#DE141C]/20"}`} aria-label="Email"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm16.6 2H4.4L12 12.2 19.6 7zM4 17h16V8.1l-7.4 5.1a1 1 0 01-1.2 0L4 8.1V17z" /></svg></button>
                      <button className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${idx % 2 === 0 ? "bg-white/10 hover:bg-white/20" : "bg-[#DE141C]/10 hover:bg-[#DE141C]/20"}`} aria-label="Phone"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.6 15.6 0 006.6 6.6l2.2-2.2a1 1 0 011-.24c1.1.36 2.2.54 3.4.54a1 1 0 011 1V20a1 1 0 01-1 1C10.3 21 3 13.7 3 4.5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.15.18 2.29.54 3.4a1 1 0 01-.25 1l-2.24 1.9z" /></svg></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y px-6 py-16 text-center">
        <p className="text-sm font-bold text-gray-500">WHAT OUR CLIENTS SAY</p>
        <h2 className="text-4xl font-bold">TESTIMONIALS</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="mt-8">
          <Testimonial />
        </div>
      </section>

      <section className="px-6 py-16 lg:px-28">
        <p className="text-center text-sm font-bold text-gray-500">KNOW US BETTER</p>
        <h2 className="text-center text-4xl font-bold">BROWSE OUR GALLERY</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="mt-8 grid gap-2 lg:grid-cols-3">
          <div className="group relative h-[30rem] overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=800&q=80')" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
            <div className="absolute bottom-5 left-5 flex items-stretch gap-3 text-white">
              <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
              <div>
                <p className="text-5xl font-bold leading-none">ACHIEVEMENTS</p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.06em]">SEE OUR MILESTONES</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <div className="group relative h-[14.75rem] overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80')" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
              <div className="absolute bottom-4 left-5 flex items-stretch gap-3 text-white">
                <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
                <div>
                  <p className="text-5xl font-bold leading-none">EVENTS</p>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-[0.06em]">MEMORABLE TIMES</p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="group relative h-[14.75rem] overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&q=80')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
                <div className="absolute bottom-4 left-4 flex items-stretch gap-3 text-white">
                  <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
                  <div>
                    <p className="text-5xl font-bold leading-none">TRAININGS</p>
                    <p className="mt-1 text-sm font-semibold uppercase tracking-[0.06em]">ENHANCING OUR SKILLS</p>
                  </div>
                </div>
              </div>
              <div className="group relative h-[14.75rem] overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&q=80')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
                <div className="absolute bottom-4 left-4 flex items-stretch gap-3 text-white">
                  <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
                  <div>
                    <p className="text-5xl font-bold leading-none">SERVICE</p>
                    <p className="mt-1 text-sm font-semibold uppercase tracking-[0.06em]">FOR THE PEOPLE</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#0F0F10] px-6 py-14 text-white lg:px-28">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-2xl font-bold">Jewellz Realty</h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
              Your trusted real estate partner for buying, selling, and investing in premium but affordable properties.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#DE141C]" />
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/70">Licensed Brokerage Team</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-white/90">Quick Links</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li><a href="/" className="transition-colors hover:text-[#DE141C]">Home</a></li>
              <li><a href="/project-list" className="transition-colors hover:text-[#DE141C]">Project List</a></li>
              <li><a href="/gallery" className="transition-colors hover:text-[#DE141C]">Gallery</a></li>
              <li><a href="/about-us" className="transition-colors hover:text-[#DE141C]">About Us</a></li>
              <li><a href="/contact" className="transition-colors hover:text-[#DE141C]">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-white/90">Contact</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Batangas, Philippines</li>
              <li>+63 917 123 4567</li>
              <li>inquiries@jewellzrealty.com</li>
              <li>Mon - Sat, 9:00 AM - 6:00 PM</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-white/90">Follow Us</h4>
            <div className="mt-4 flex items-center gap-2">
              <a href="#" className="grid h-9 w-9 place-items-center border border-white/20 text-white/85 transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white">f</a>
              <a href="#" className="grid h-9 w-9 place-items-center border border-white/20 text-white/85 transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white">ig</a>
              <a href="#" className="grid h-9 w-9 place-items-center border border-white/20 text-white/85 transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white">in</a>
              <a href="#" className="grid h-9 w-9 place-items-center border border-white/20 text-white/85 transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white">yt</a>
            </div>
            <p className="mt-4 text-sm text-white/65">Stay updated with listings, open houses, and real estate tips.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-5 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
          <p>Copyright Jewellz Realty 2026. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[#DE141C]">Privacy Policy</a>
            <a href="#" className="hover:text-[#DE141C]">Terms & Conditions</a>
          </div>
        </div>
      </footer>
    </main>
  );
}





