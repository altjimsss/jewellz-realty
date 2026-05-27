"use client";

import { useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyFilters, type PropertyFiltersState } from "@/components/properties/PropertyFilters";
import { PropertyGrid } from "@/components/properties/PropertyGrid";
import { SparkleSvg } from "@/components/ui/SparkleSvg";
import type { Property } from "@/types/property";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

const CATEGORY_TABS = ["All", "Featured", "For Sale", "For Rent", "Pre-selling", "Commercial"] as const;

const SAMPLE_PROPERTIES: Property[] = [
  {
    id: "p1",
    slug: "luxury-family-home",
    title: "Luxury Family Home",
    location: "151 Tompkins Ave",
    price: 2850000,
    beds: 4,
    baths: 1,
    areaSqm: 200,
    type: "House",
    category: "For Sale",
    featured: true,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
  },
  {
    id: "p2",
    slug: "skyper-pool-apartment",
    title: "Skyper Pool Apartment",
    location: "88 Lakeview Dr",
    price: 2650000,
    beds: 3,
    baths: 2,
    areaSqm: 180,
    type: "Apartment",
    category: "For Rent",
    featured: false,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
  },
  {
    id: "p3",
    slug: "house-on-the-hollywood",
    title: "House on the Hollywood",
    location: "42 Sunset Blvd",
    price: 3450000,
    beds: 5,
    baths: 3,
    areaSqm: 260,
    type: "House",
    category: "For Sale",
    featured: true,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
  },
  {
    id: "p4",
    slug: "gorgeous-villa-bay",
    title: "Gorgeous Villa Bay",
    location: "15 Shoreline Rd",
    price: 3150000,
    beds: 4,
    baths: 3,
    areaSqm: 240,
    type: "House",
    category: "Pre-selling",
    featured: false,
    image: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200&q=80",
  },
  {
    id: "p5",
    slug: "diamond-manor-apartment",
    title: "Diamond Manor Apartment",
    location: "11 Sapphire St",
    price: 1950000,
    beds: 2,
    baths: 1,
    areaSqm: 120,
    type: "Condo",
    category: "For Rent",
    featured: false,
    image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80",
  },
  {
    id: "p6",
    slug: "comfortable-villa-green",
    title: "Comfortable Villa Green",
    location: "73 Garden Way",
    price: 2980000,
    beds: 4,
    baths: 2,
    areaSqm: 210,
    type: "Townhouse",
    category: "Pre-selling",
    featured: true,
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80",
  },
  {
    id: "p7",
    slug: "modern-loft-residence",
    title: "Modern Loft Residence",
    location: "27 Midtown Ave",
    price: 2150000,
    beds: 2,
    baths: 2,
    areaSqm: 135,
    type: "Condo",
    category: "For Sale",
    featured: false,
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80",
  },
  {
    id: "p8",
    slug: "serenity-hills-house",
    title: "Serenity Hills House",
    location: "9 Pinecrest Rd",
    price: 2420000,
    beds: 3,
    baths: 2,
    areaSqm: 170,
    type: "House",
    category: "For Sale",
    featured: false,
    image: "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&q=80",
  },
  {
    id: "p9",
    slug: "coastal-breeze-condo",
    title: "Coastal Breeze Condo",
    location: "101 Seaside Blvd",
    price: 1780000,
    beds: 2,
    baths: 1,
    areaSqm: 110,
    type: "Condo",
    category: "For Rent",
    featured: false,
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
  },
  {
    id: "p10",
    slug: "prime-city-penthouse",
    title: "Prime City Penthouse",
    location: "66 Grand Tower",
    price: 3980000,
    beds: 3,
    baths: 2,
    areaSqm: 190,
    type: "Condo",
    category: "Commercial",
    featured: true,
    image: "https://images.unsplash.com/photo-1464890100898-a385f744067f?w=1200&q=80",
  },
  {
    id: "p11",
    slug: "elegant-mountain-home",
    title: "Elegant Mountain Home",
    location: "5 Summit Pass",
    price: 4550000,
    beds: 5,
    baths: 4,
    areaSqm: 320,
    type: "House",
    category: "Commercial",
    featured: false,
    image: "https://images.unsplash.com/photo-1430285561322-7808604715df?w=1200&q=80",
  },
  {
    id: "p12",
    slug: "parkview-starter-home",
    title: "Parkview Starter Home",
    location: "230 Maple Lane",
    price: 2090000,
    beds: 3,
    baths: 2,
    areaSqm: 145,
    type: "Townhouse",
    category: "Pre-selling",
    featured: false,
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&q=80",
  },
];

const BANNER_DURATION_MS = 5500;
const BANNER_TICK_MS = 50;

type BannerSlide = {
  key: string;
  Svg: () => JSX.Element;
};

function BannerSvgOne() {
  return (
    <div className="relative flex h-full w-full items-center rounded-[18px] bg-black">
      {/* Content */}
      <div className="relative z-20 flex items-stretch gap-3 pl-4 md:pl-8">
        <span className="w-[3px] bg-[#DE141C]" />

        <div className="relative">
          <p className="text-[11px] font-bold leading-none tracking-[0.18em] text-[#7F7F7F] md:text-[13px]">
            DISCOVER YOUR
          </p>

          <h2 className="mt-1 text-[40px] font-bold leading-[0.95] text-white md:text-[54px]">
            DREAM
            <br />
            PROPERTY
          </h2>

          <SparkleSvg
            showExtra
            className="pointer-events-none absolute -right-[145px] top-1 h-auto w-[132px] md:-right-[165px] md:w-[150px]"
          />
        </div>
      </div>

      {/* IMAGE */}
      <img
  src="/assets/housebanner1.png"
  alt="House banner"
  className="
    absolute
    right-[-30px]
top-[46%] -translate-y-1/2    z-10
    h-[260px]
    md:h-[360px]
    max-w-none
    -translate-y-1/2
    object-contain
  "
/>
    </div>
  );
}


function BannerSvgTwo() {
  return (
    <svg viewBox="0 0 520 360" className="h-full w-full" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="g2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(380 120) rotate(140) scale(320 260)">
          <stop offset="0" stopColor="#DE141C" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="24" y="24" width="472" height="312" rx="18" fill="#ffffff" opacity="0.06" />
      <rect x="24" y="24" width="472" height="312" rx="18" fill="url(#g2)" opacity="0.32" />
      <path d="M74 102h250" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round" />
      <path d="M74 140h200" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="6" strokeLinecap="round" />
      <path d="M74 178h160" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="6" strokeLinecap="round" />
      <path d="M128 274l48-66 42 36 62-90 92 120" stroke="#DE141C" strokeOpacity="0.65" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="128" cy="274" r="6" fill="#ffffff" fillOpacity="0.7" />
      <circle cx="176" cy="208" r="6" fill="#ffffff" fillOpacity="0.7" />
      <circle cx="218" cy="244" r="6" fill="#ffffff" fillOpacity="0.7" />
      <circle cx="280" cy="154" r="6" fill="#ffffff" fillOpacity="0.7" />
      <circle cx="372" cy="274" r="6" fill="#ffffff" fillOpacity="0.7" />
    </svg>
  );
}

function BannerSvgThree() {
  return (
    <svg viewBox="0 0 520 360" className="h-full w-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="g3" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="0.55" stopColor="#DE141C" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="30" y="40" width="460" height="280" rx="18" fill="#ffffff" opacity="0.06" />
      <path d="M64 92h392" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M64 144h392" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M64 196h392" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M64 248h392" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M96 268c60-20 104-74 156-104 62-34 122-10 184 32" stroke="url(#g3)" strokeWidth="10" strokeLinecap="round" />
      <path d="M382 78l22 22m0-22-22 22" stroke="#DE141C" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" />
      <path d="M420 110l16 16m0-16-16 16" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const BANNER_SLIDES: BannerSlide[] = [
  {
    key: "discover",
    Svg: BannerSvgOne,
  },
  {
    key: "invest",
    Svg: BannerSvgTwo,
  },
  {
    key: "featured",
    Svg: BannerSvgThree,
  },
];

export default function Page() {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORY_TABS)[number]>("All");
  const [filters, setFilters] = useState<PropertyFiltersState>({
    keyword: "",
    lookingFor: "",
    location: "",
    priceMin: "",
    priceMax: "",
  });

  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerElapsed, setBannerElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBannerElapsed((prev) => {
        const next = prev + BANNER_TICK_MS;
        if (next >= BANNER_DURATION_MS) {
          setBannerIndex((idx) => (idx + 1) % BANNER_SLIDES.length);
          return 0;
        }
        return next;
      });
    }, BANNER_TICK_MS);

    return () => window.clearInterval(id);
  }, []);

  const bannerProgress = Math.min(100, (bannerElapsed / BANNER_DURATION_MS) * 100);

  const filteredProperties = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const lookingFor = filters.lookingFor.trim().toLowerCase();
    const location = filters.location.trim().toLowerCase();
    const priceMin = filters.priceMin === "" ? undefined : Number(filters.priceMin);
    const priceMax = filters.priceMax === "" ? undefined : Number(filters.priceMax);

    return SAMPLE_PROPERTIES.filter((p) => {
      const matchesTab =
        activeCategory === "All"
          ? true
          : activeCategory === "Featured"
            ? !!p.featured
            : (p.category ?? "") === activeCategory;

      if (!matchesTab) return false;

      if (keyword) {
        const haystack = `${p.title} ${p.location ?? ""}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }

      if (lookingFor) {
        const propType = (p.type ?? "").toLowerCase();
        if (!propType.includes(lookingFor)) return false;
      }

      if (location) {
        const propLoc = (p.location ?? "").toLowerCase();
        if (!propLoc.includes(location)) return false;
      }

      if (Number.isFinite(priceMin) && p.price < (priceMin as number)) return false;
      if (Number.isFinite(priceMax) && p.price > (priceMax as number)) return false;

      return true;
    });
  }, [activeCategory, filters]);

  return (
    <main className={`${poppins.className} bg-white text-[#181A20]`}>
      <div className="flex h-7 items-center justify-center gap-1 bg-black px-2 text-[10px] text-[#FAFAFA] sm:h-8 sm:gap-2 sm:text-sm">
        <p className="whitespace-nowrap">Premium but Affordable (deals) Properties on Sale.</p>
        <a className="underline" href="#">
          BrowseNow
        </a>
      </div>

      <Navbar links={navLinks} fontClassName={poppins.className} />

<section className="relative overflow-hidden bg-black">
  <div className="mx-auto max-w-[1200px] px-4 py-6 md:py-8">
    <div className="relative h-[150px] md:h-[190px]">
      {BANNER_SLIDES.map((slide, idx) => {
        const Svg = slide.Svg;
        const isActive = idx === bannerIndex;

        return (
          <div
            key={slide.key}
            className={`absolute inset-0 transition-opacity duration-700 ${
              isActive ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {/* IMPORTANT CHANGE */}
            <div className="relative mx-auto h-full w-full max-w-[860px] overflow-visible">
              <Svg />
            </div>
          </div>
        );
      })}
    </div>
  </div>
</section>

      <section className="mx-auto mt-6 max-w-[1200px] px-4">
        <PropertyFilters
          value={filters}
          onChange={setFilters}
          onSubmit={() => {
            // No-op: filtering is live; button is for UX parity.
          }}
        />
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Properties</h2>
            <p className="mt-1 text-sm text-black/60">Showing {filteredProperties.length} results</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_TABS.map((tab) => {
              const active = tab === activeCategory;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCategory(tab)}
                  className={`h-9 rounded-sm border px-3 text-xs font-semibold transition-colors ${
                    active
                      ? "border-[#DE141C] bg-[#DE141C] text-white"
                      : "border-black/10 bg-white text-black hover:bg-black/5"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7">
          <PropertyGrid properties={filteredProperties} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
