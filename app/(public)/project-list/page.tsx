"use client";

import { useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyFilters, type PropertyFiltersState } from "../../../components/properties/PropertyFilters";
import { PropertyGrid } from "@/components/properties/PropertyGrid";
import { PropertyMapPreview } from "@/components/properties/PropertyMapPreview";
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

const CATEGORY_TABS = ["All", "Condo", "House", "Lot", "Farm", "Memorial"] as const;

const SAMPLE_PROPERTIES: Property[] = [
  {
    id: "p1",
    slug: "luxury-family-home",
    title: "Luxury Family Home",
    location: "Batangas City, Batangas",
    coordinates: [13.7562, 121.0583],
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
    location: "Lipa City, Batangas",
    coordinates: [13.9411, 121.1633],
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
    location: "Nasugbu, Batangas",
    coordinates: [14.0725, 120.6339],
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
    <div className="relative flex h-full w-full items-center rounded-[18px] bg-transparent">
      <div className="relative z-20 flex items-stretch gap-3 pl-4 md:pl-8">
        {/* Red line fades in first */}
        <span
          className="w-[3px] bg-[#DE141C]"
          style={{ animation: "banner-fade-in 0.4s ease-out both" }}
        />

        <div className="relative">
          {/* Subtitle slides out from behind the line */}
          <div className="overflow-hidden">
            <p
              className="text-[11px] font-bold leading-none tracking-[0.18em] text-[#7F7F7F] md:text-[13px]"
              style={{ animation: "banner-slide-right 0.45s ease-out both", animationDelay: "0.35s" }}
            >
              DISCOVER YOUR
            </p>
          </div>

          {/* Heading slides out from behind the line */}
          <div className="overflow-hidden">
            <h2
              className="mt-1 text-[40px] font-bold leading-[0.95] text-white md:text-[54px]"
              style={{ animation: "banner-slide-right 0.5s ease-out both", animationDelay: "0.45s" }}
            >
              DREAM
              <br />
              PROPERTY
            </h2>
          </div>

          {/* Sparkle fades in last */}
          <div
            className="pointer-events-none absolute z-0 -right-[145px] top-1 w-[132px] md:-right-[165px] md:w-[150px]"
            style={{ animation: "banner-fade-in 0.5s ease-out both", animationDelay: "0.6s" }}
          >
            <SparkleSvg showExtra className="h-auto w-full" />
          </div>
        </div>
      </div>

      <img
        src="/assets/housebanner1.png"
        alt="House banner"
        className="absolute right-[-30px] top-[46%] -translate-y-1/2 z-20 h-[260px] md:h-[360px] max-w-none object-contain"
        style={{ animation: "banner-fade-in 0.6s ease-out both", animationDelay: "0.5s" }}
      />
    </div>
  );
}

function BannerSvgTwo() {
  return (
    <div className="relative flex h-full w-full items-center rounded-[18px] bg-transparent">
      <div className="relative z-20 flex items-stretch gap-3 pl-4 md:pl-8">
        <span
          className="w-[3px] bg-[#DE141C]"
          style={{ animation: "banner-fade-in 0.4s ease-out both" }}
        />
        <div className="relative">
          <div className="overflow-hidden">
            <p
              className="text-[11px] font-bold leading-none tracking-[0.18em] text-[#7F7F7F] md:text-[13px]"
              style={{ animation: "banner-slide-right 0.45s ease-out both", animationDelay: "0.35s" }}
            >
              LISTINGS &amp; SELLING
            </p>
          </div>
          <div className="overflow-hidden">
            <h2
              className="mt-1 text-[40px] font-bold leading-[0.95] text-white md:text-[54px]"
              style={{ animation: "banner-slide-right 0.5s ease-out both", animationDelay: "0.45s" }}
            >
              EXPERT BROKER
              <br />
              ASSISTANCE
            </h2>
          </div>
          <div
            className="pointer-events-none absolute z-0 -right-[145px] top-1 w-[132px] md:-right-[165px] md:w-[150px]"
            style={{ animation: "banner-fade-in 0.5s ease-out both", animationDelay: "0.6s" }}
          >
            <SparkleSvg showExtra className="h-auto w-full" />
          </div>
        </div>
      </div>

      <img
        src="/assets/bannerprofessional.png"
        alt="Listings and selling banner"
        className="absolute right-[-40px] top-[40%] -translate-y-1/2 z-20 h-[220px] md:h-[300px] max-w-none object-contain"
        style={{ animation: "banner-fade-in 0.6s ease-out both", animationDelay: "0.5s" }}
      />
    </div>
  );
}

function BannerSvgThree() {
  return (
    <div className="relative flex h-full w-full items-center rounded-[18px] bg-transparent">
      <div className="relative z-20 flex items-stretch gap-3 pl-4 md:pl-8">
        <span
          className="w-[3px] bg-[#DE141C]"
          style={{ animation: "banner-fade-in 0.4s ease-out both" }}
        />
        <div className="relative">
          <div className="overflow-hidden">
            <p
              className="text-[11px] font-bold leading-none tracking-[0.18em] text-[#7F7F7F] md:text-[13px]"
              style={{ animation: "banner-slide-right 0.45s ease-out both", animationDelay: "0.35s" }}
            >
              INVEST &amp; GROW
            </p>
          </div>
          <div className="overflow-hidden">
            <h2
              className="mt-1 text-[40px] font-bold leading-[0.95] text-white md:text-[54px]"
              style={{ animation: "banner-slide-right 0.5s ease-out both", animationDelay: "0.45s" }}
            >
              CONSULTATION
              <br />
              &amp; GROWTH
            </h2>
          </div>
          <div
            className="pointer-events-none absolute z-0 -right-[145px] top-1 w-[132px] md:-right-[165px] md:w-[150px]"
            style={{ animation: "banner-fade-in 0.5s ease-out both", animationDelay: "0.6s" }}
          >
            <SparkleSvg showExtra className="h-auto w-full" />
          </div>
        </div>
      </div>

      <img
        src="/assets/bannerconsult.png"
        alt="Investment consultation banner"
        className="absolute right-[-40px] top-[40%] -translate-y-1/2 z-20 h-[220px] md:h-[300px] max-w-none object-contain"
        style={{ animation: "banner-fade-in 0.6s ease-out both", animationDelay: "0.5s" }}
      />
    </div>
  );
}

const BANNER_SLIDES: BannerSlide[] = [
  { key: "discover", Svg: BannerSvgOne },
  { key: "invest", Svg: BannerSvgTwo },
  { key: "featured", Svg: BannerSvgThree },
];

function getFilteredProperties(
  properties: Property[],
  activeCategory: (typeof CATEGORY_TABS)[number],
  filters: PropertyFiltersState
) {
  const keyword = filters.keyword.trim().toLowerCase();
  const lookingFor = filters.lookingFor.trim().toLowerCase();
  const location = filters.location.trim().toLowerCase();
  const subLocation = filters.subLocation.trim().toLowerCase();
  const priceMin = filters.priceMin === "" ? undefined : Number(filters.priceMin);
  const priceMax = filters.priceMax === "" ? undefined : Number(filters.priceMax);

  return properties.filter((property) => {
    const matchesTab = activeCategory === "All" ? true : (property.type ?? "") === activeCategory;
    if (!matchesTab) return false;
    if (keyword) {
      const haystack = `${property.title} ${property.location ?? ""}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (lookingFor) {
      const propType = (property.type ?? "").toLowerCase();
      if (!propType.includes(lookingFor)) return false;
    }
    if (location) {
      const propLoc = (property.location ?? "").toLowerCase();
      if (!propLoc.includes(location)) return false;
    }
    if (subLocation) {
      const propLoc = (property.location ?? "").toLowerCase();
      if (!propLoc.includes(subLocation)) return false;
    }
    if (Number.isFinite(priceMin) && property.price < (priceMin as number)) return false;
    if (Number.isFinite(priceMax) && property.price > (priceMax as number)) return false;
    return true;
  });
}

export default function Page() {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORY_TABS)[number]>("All");
  const [draftFilters, setDraftFilters] = useState<PropertyFiltersState>({
    keyword: "",
    lookingFor: "",
    location: "",
    subLocation: "",
    priceMin: "",
    priceMax: "",
    status: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<PropertyFiltersState>({
    keyword: "",
    lookingFor: "",
    location: "",
    subLocation: "",
    priceMin: "",
    priceMax: "",
    status: "",
  });
  const [hasSearched, setHasSearched] = useState(false);
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
  void bannerProgress;

  const filteredProperties = useMemo(() => {
    return getFilteredProperties(SAMPLE_PROPERTIES, activeCategory, appliedFilters);
  }, [activeCategory, appliedFilters]);

  const hasSearchCriteria =
    activeCategory !== "All" ||
    appliedFilters.keyword.trim() !== "" ||
    appliedFilters.lookingFor.trim() !== "" ||
    appliedFilters.location.trim() !== "" ||
    appliedFilters.subLocation.trim() !== "" ||
    appliedFilters.priceMin.trim() !== "" ||
    appliedFilters.priceMax.trim() !== "" ||
    appliedFilters.status.trim() !== "";

  const primaryProperty = filteredProperties[0] ?? null;
  const showMapPreview = hasSearched && hasSearchCriteria && Boolean(primaryProperty);

  return (
    <main className={`${poppins.className} bg-white text-[#181A20]`}>
      <style>{`
        @keyframes banner-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes banner-slide-right {
          from { opacity: 0; transform: translateX(-60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="flex h-7 items-center justify-center gap-1 bg-black px-2 text-[10px] text-[#FAFAFA] sm:h-8 sm:gap-2 sm:text-sm">
        <p className="whitespace-nowrap">Premium but Affordable (deals) Properties on Sale.</p>
        <a className="underline" href="#">
          BrowseNow
        </a>
      </div>

      <Navbar links={navLinks} fontClassName={poppins.className} />

      <section className="relative isolate overflow-hidden bg-black">
        {/* Gradient — left side */}
        <img
          src="/assets/Gradient V25.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 z-0 h-80 w-80 md:h-[34rem] md:w-[34rem]"
        />
        {/* Gradient — right side, flipped + rotated */}
        

        <div className="relative mx-auto max-w-[1200px] px-4 py-6 md:py-8">
          <div className="relative h-[150px] md:h-[190px]">
            {BANNER_SLIDES.map((slide, idx) => {
              const Svg = slide.Svg;
              const isActive = idx === bannerIndex;

              return (
                <div
                  key={`${slide.key}-${isActive ? "active" : "inactive"}`}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    isActive ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
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
          value={draftFilters}
          onChange={setDraftFilters}
          onSubmit={() => {
            setAppliedFilters(draftFilters);
            setHasSearched(true);
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

        <div className={`mt-7 grid gap-6 ${showMapPreview ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
          <div>
            {filteredProperties.length > 0 ? (
              <PropertyGrid
                properties={filteredProperties}
                className={showMapPreview ? "grid grid-cols-2 gap-3 sm:gap-5" : undefined}
              />
            ) : (
              <div className="rounded-[18px] border border-dashed border-black/15 bg-white p-8 text-center text-sm text-black/55">
                No properties matched your search. Try a different keyword, location, or category.
              </div>
            )}
          </div>

          {showMapPreview && primaryProperty ? (
            <aside className="overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/50">Map Preview</p>
                <h3 className="mt-1 text-[18px] font-semibold leading-tight text-black">Results</h3>
                <p className="mt-1 text-sm text-black/55">{filteredProperties.length} matched properties</p>
              </div>
              <PropertyMapPreview properties={filteredProperties} />
            </aside>
          ) : null}
        </div>
      </section>

      <Footer />
    </main>
  );
}