"use client";

import dynamic from "next/dynamic";
import { SafeImage } from "@/components/ui/SafeImage";
import { PartnerLogoMark } from "@/components/home/PartnerLogoMark";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Poppins } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SparkleSvg } from "@/components/ui/SparkleSvg";
import { CountUpOnView } from "@/components/ui/CountUpOnView";
import { formatPHPWhole } from "@/lib/currency";
import { useHeroCarousel } from "@/hooks/useHeroCarousel";
import { ServiceShowcase } from "@/components/home/ServiceShowcase";
import type { Property } from "@/types/property";
const HomeDiscoverySection = dynamic(() => import("@/components/home/HomeDiscoverySection"), { ssr: false });

const LogoLoop = dynamic(() => import("@/components/home/LogoLoop"), { ssr: false });
const MeetAgents = dynamic(() => import("@/components/home/MeetAgents").then((module) => module.MeetAgents), {
  ssr: false,
});
const Testimonial = dynamic(() => import("@/components/ui/design-testimonial").then((module) => module.Testimonial), {
  ssr: false,
});

function DeferredTestimonial() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || shouldLoad) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: "400px 0px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return <div ref={sectionRef} className="min-h-[280px] sm:min-h-[320px]">{shouldLoad ? <Testimonial /> : null}</div>;
}


type HomeContent = {
	heroBanners?: Array<{ headline: string; subheadline?: string; imageUrl: string; ctaLabel?: string; ctaUrl?: string }>;
	siteStats?: Array<{ key: string; label: string; value: number; suffix?: string }>;
	partnerLogos?: Array<{ name: string; logoUrl?: string; websiteUrl?: string }>;
	testimonials?: Array<{ authorName: string; authorTitle?: string; quote: string; rating?: number }>;
	agents?: Array<{ name: string; top: boolean; photoUrl?: string; licenseNumber?: string; specialization?: string; facebookUrl?: string; instagramUrl?: string; email?: string; phone?: string }>;
};
type HomepageFeaturedResponse = {
	properties?: Property[];
	refreshesAt?: string;
	secondsUntilRefresh?: number;
};
type HeroDisplayProperty = {
	image: string;
	title: string;
	price: string;
	status: string;
	location: string;
	area: string;
	bedroom: number | string;
	bathroom: number | string;
	garage: number | string;
	slug?: string;
};
const HERO_DURATION_MS = 5000;
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });
const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

const STATUS_QUERY_VALUES: Record<string, string> = {
  "for-sale": "For Sale",
  "pre-selling": "Pre-Selling",
  ready: "Ready for Occupancy",
};

type HeroSearchFilters = {
  location: string;
  subLocation: string;
  baths: string;
  status: string;
  guests: string;
  beds: string;
};

const defaultHeroSearchFilters: HeroSearchFilters = {
  location: "",
  subLocation: "",
  baths: "",
  status: "",
  guests: "",
  beds: "",
};

type HomePageClientProps = {
  initialFeaturedProperties?: Property[];
  initialFeaturedRefreshesAt?: string | null;
  initialHomeContent?: HomeContent | null;
  locationOptions?: Array<{ province: string; municipality: string }>;
};

export default function Page({
  initialFeaturedProperties = [],
  initialFeaturedRefreshesAt = null,
  initialHomeContent = null,
  locationOptions = [],
}: HomePageClientProps) {
  const router = useRouter();
  const [homeContent, setHomeContent] = useState<HomeContent | null>(initialHomeContent);
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>(initialFeaturedProperties);
  const [featuredRefreshesAt, setFeaturedRefreshesAt] = useState<string | null>(initialFeaturedRefreshesAt);
  const [priceMax, setPriceMax] = useState(850000);
  const [areaMax, setAreaMax] = useState(170);
  const [isMobileHeroFiltersOpen, setIsMobileHeroFiltersOpen] = useState(false);
  const [loadedHeroImages, setLoadedHeroImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialHomeContent) return;

    let isMounted = true;
    async function loadFreshHomeContent() {
      try {
        const response = await fetch("/api/content/home", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as HomeContent;
        if (isMounted && data) {
          setHomeContent(data);
        }
      } catch {
        // Fall back to initial content if fetch fails
      }
    }
    loadFreshHomeContent();
    return () => {
      isMounted = false;
    };
  }, [initialHomeContent]);
  const [heroSearchFilters, setHeroSearchFilters] = useState<HeroSearchFilters>(defaultHeroSearchFilters);
  const mobileHeroActiveFilterCount = Object.values(heroSearchFilters).filter(Boolean).length
    + (priceMax < 850000 ? 1 : 0)
    + (areaMax !== 170 ? 1 : 0);
  const provinceOptions = [...new Map(locationOptions.map((item) => [item.province.trim().toLocaleLowerCase(), item.province.trim()])).values()]
    .sort((first, second) => first.localeCompare(second));
  const municipalityOptions = [...new Map(
    locationOptions
      .filter((item) => item.province.trim().toLocaleLowerCase() === heroSearchFilters.location.trim().toLocaleLowerCase())
      .map((item) => [item.municipality.trim().toLocaleLowerCase(), item.municipality.trim()]),
  ).values()].sort((first, second) => first.localeCompare(second));

  const safePriceMax = Math.min(Math.max(priceMax, 0), 850000);
  const priceRangeLabel = `Price (${formatPHPWhole(0)}-${formatPHPWhole(safePriceMax)})`;

  const propertyHeroProperties: HeroDisplayProperty[] = featuredProperties.slice(0, 5).map((property) => ({
    image: property.image?.trim() || property.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    title: property.title,
    price: formatPHPWhole(property.price),
    status: property.category ?? (property.featured ? "Featured" : "Hot Pick"),
    location: property.location ?? "Jewellz Realty",
    area: property.areaSqm ? `${property.areaSqm.toLocaleString("en-PH")} sqm` : "View Details",
    bedroom: property.beds ?? 0,
    bathroom: property.baths ?? 0,
    garage: Number(property.specs?.find((spec) => spec.label.toLowerCase().includes("garage"))?.value ?? 0) || 0,
    slug: property.slug,
  }));
  const displayedHeroProperties: HeroDisplayProperty[] = propertyHeroProperties.length
    ? propertyHeroProperties
    : [{
        image: "/assets/housebanner1.webp",
        title: "Find your next property",
        price: "",
        status: "",
        location: "",
        area: "—",
        bedroom: "—",
        bathroom: "—",
        garage: "—",
      }];
  const displayedStats = homeContent?.siteStats?.length ? homeContent.siteStats : [
    { key: "properties", label: "Properties", value: 500, suffix: "+" },
    { key: "agents", label: "Agents", value: 50, suffix: "+" },
    { key: "provinces", label: "Provinces", value: 10, suffix: "+" },
  ];
  const displayedLogos = (homeContent?.partnerLogos ?? []).map((logo) => ({
      title: logo.name,
      href: logo.websiteUrl,
      node: <PartnerLogoMark name={logo.name} logoUrl={logo.logoUrl} />,
    }));

const { heroIndex, onPrevHero, onNextHero } = useHeroCarousel({
    heroCount: displayedHeroProperties.length,
    durationMs: HERO_DURATION_MS,
  });

  const updateHeroSearchFilter = (key: keyof HeroSearchFilters, value: string) => {
		setHeroSearchFilters((current) => ({
			...current,
			[key]: value,
			...(key === "location" ? { subLocation: "" } : {}),
		}));
  };

  const submitHeroSearch = () => {
    const params = new URLSearchParams();

    if (heroSearchFilters.location) params.set("location", heroSearchFilters.location);
    if (heroSearchFilters.subLocation) params.set("subLocation", heroSearchFilters.subLocation);
    if (heroSearchFilters.status) params.set("status", STATUS_QUERY_VALUES[heroSearchFilters.status] ?? heroSearchFilters.status);
    if (heroSearchFilters.beds) params.set("beds", heroSearchFilters.beds.includes("+") ? heroSearchFilters.beds : heroSearchFilters.beds + "+");
    if (heroSearchFilters.baths) params.set("baths", heroSearchFilters.baths.includes("+") ? heroSearchFilters.baths : heroSearchFilters.baths + "+");
    if (safePriceMax > 0 && safePriceMax < 850000) params.set("priceMax", String(safePriceMax));

    const query = params.toString();
    router.push(query ? `/project-list?${query}` : "/project-list");
  };

  const refreshFeaturedProperties = useCallback(async () => {
    try {
      const response = await fetch("/api/home/featured", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as HomepageFeaturedResponse;
      setFeaturedProperties(Array.isArray(data.properties) ? data.properties : []);
      setFeaturedRefreshesAt(data.refreshesAt ?? null);
    } catch {
      // Keep the current content if the database read fails.
    }
  }, []);

  const currentHero = displayedHeroProperties[heroIndex % displayedHeroProperties.length];

  return (
    <main className={`${poppins.className} bg-white text-[#181A20]`}>
      <AnnouncementBar />
      <Navbar links={navLinks} fontClassName={poppins.className} />

      <section className="customer-hero relative overflow-hidden bg-black lg:h-[520px]">
        <div className="absolute right-0 top-0 z-0 hidden h-full w-[70%] overflow-hidden transition-all duration-700 lg:block">
          {displayedHeroProperties.map((hero, idx) => (
            !loadedHeroImages[hero.slug ?? hero.title] && idx !== heroIndex ? null : (
            <div key={`desktop-hero-${hero.title}`} className={`absolute inset-0 transition-all duration-700 ease-out ${idx === heroIndex ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}>
              {hero.slug ? (
                <Link href={`/project-list/${hero.slug}`} aria-label={`View ${hero.title} project description`} className="absolute inset-0 cursor-pointer">
                  <SafeImage src={hero.image} fallbackSrc="/assets/housebanner1.webp" alt={`View ${hero.title}`} fill sizes="100vw" priority={idx === 0} quality={70} onLoad={() => setLoadedHeroImages((current) => current[hero.slug ?? hero.title] ? current : { ...current, [hero.slug ?? hero.title]: true })} className="object-cover object-center" />
                </Link>
              ) : (
                <SafeImage src={hero.image} fallbackSrc="/assets/housebanner1.webp" alt="" fill sizes="100vw" priority={idx === 0} quality={70} onLoad={() => setLoadedHeroImages((current) => current[hero.slug ?? hero.title] ? current : { ...current, [hero.slug ?? hero.title]: true })} className="object-cover object-center" />
              )}
            </div>
            )
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 hidden w-[34%] bg-gradient-to-r from-black/85 via-black/45 to-transparent lg:block" />
        <div className="absolute bottom-0 right-0 hidden h-[5px] w-[70%] overflow-hidden rounded bg-white/25 lg:block">
          <div key={`desktop-progress-${heroIndex}`} className="hero-progress-fill h-full bg-[#DE141C]" style={{ animationDuration: `${HERO_DURATION_MS}ms` }} />
        </div>
        <div className="absolute bottom-8 left-[35%] z-20 hidden w-[36%] lg:block">
          <div className="mb-0 relative inline-flex overflow-hidden">
            <button type="button"
              onClick={() => {
                onPrevHero();
              }}
              className="grid h-9 w-10 place-items-center bg-[#DE141C] text-2xl leading-none text-white focus-visible:ring-2 focus-visible:ring-black/20"
            >
              &lsaquo;
            </button>
            <button type="button"
              onClick={onNextHero}
              className="grid h-9 w-10 place-items-center bg-white text-2xl leading-none text-[#DE141C] focus-visible:ring-2 focus-visible:ring-black/20"
            >
              &rsaquo;
            </button>
          </div>
          <div className="bg-black/70 px-4 py-3 text-white">
            <h3 className="text-[28px] leading-tight font-bold">{currentHero.title}</h3>
            <div className="mt-1.5 flex items-center gap-3 text-[12px]">
              <p className="font-semibold">{currentHero.price}</p>
              <span className="rounded bg-[#DE141C] px-2 py-0.5 text-[12px] font-bold">{currentHero.status}</span>
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
              <div><p className="text-[13px] font-bold">{currentHero.area}</p><p className="text-[12px] text-black/60">Area</p></div>
            </div>
            <div className="flex items-center gap-2 border-r border-black/10 px-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
                <path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div><p className="text-[13px] font-bold">{currentHero.bedroom}</p><p className="text-[12px] text-black/60">Bedroom</p></div>
            </div>
            <div className="flex items-center gap-2 border-r border-black/10 px-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
                <path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div><p className="text-[13px] font-bold">{currentHero.bathroom}</p><p className="text-[12px] text-black/60">Bathroom</p></div>
            </div>
            <div className="flex items-center gap-2 pl-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
                <path d="M3 11l9-7 9 7M6 9v11h12V9M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div><p className="text-[13px] font-bold">{currentHero.garage}</p><p className="text-[12px] text-black/60">Garage</p></div>
            </div>
          </div>
        </div>

        <div className="absolute left-10 top-12 hidden h-28 w-[3px] bg-[#DE141C] lg:block" />
        <div className="absolute left-14 top-11 hidden items-start gap-4 lg:flex">
          <div>
            <p className="font-bold text-[#7F7F7F]">DISCOVER YOUR</p>
            <h1 className="text-5xl font-bold leading-[0.92] text-white">DREAM<br />PROPERTY</h1>
          </div>
          <SparkleSvg className="mt-1 h-auto w-[120px] shrink-0" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitHeroSearch();
          }}
          className="absolute left-10 top-52 hidden w-[370px] lg:block"
        >
          <div className="grid grid-cols-2 gap-3.5">
            <div className="relative">
              <select
                value={heroSearchFilters.location}
                onChange={(e) => updateHeroSearchFilter("location", e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
              >
                <option value="">Location</option>
                {provinceOptions.map((province) => <option key={province} value={province}>{province}</option>)}
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
              <select
                value={heroSearchFilters.subLocation}
                onChange={(e) => updateHeroSearchFilter("subLocation", e.target.value)}
                disabled={!heroSearchFilters.location}
                className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
              >
                <option value="">{heroSearchFilters.location ? "All municipalities" : "Select province first"}</option>
                {municipalityOptions.map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}
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
              <select
                value={heroSearchFilters.baths}
                onChange={(e) => updateHeroSearchFilter("baths", e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
              >
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
              <select
                value={heroSearchFilters.status}
                onChange={(e) => updateHeroSearchFilter("status", e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
              >
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
              <select
                value={heroSearchFilters.guests}
                onChange={(e) => updateHeroSearchFilter("guests", e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
              >
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
              <select
                value={heroSearchFilters.beds}
                onChange={(e) => updateHeroSearchFilter("beds", e.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-9 text-xs text-[#D0D0D0] outline-none transition-colors focus:border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
              >
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
                aria-label="Maximum price"
                className="h-1.5 w-full accent-[#DE141C]"
                type="range"
                min="0"
                max="850000"
                step="10000"
                value={safePriceMax}
                onChange={(e) => setPriceMax(Math.min(Number(e.target.value) || 0, 850000))}
              />
              <span className="sr-only">Price range</span>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-[#8B8B8B]">Area (120-{areaMax})</p>
              <input
                aria-label="Maximum area"
                className="h-1.5 w-full accent-[#DE141C]"
                type="range"
                min="120"
                max="500"
                step="1"
                value={areaMax ?? 120}
                onChange={(e) => setAreaMax(Number(e.target.value) || 120)}
              />
              <span className="sr-only">Area range</span>
            </div>
          </div>
          <button type="submit" className="mx-auto mt-5 block h-10 w-[170px] rounded bg-[#DE141C] text-xs font-bold text-white">Search Property</button>
        </form>

        <div className="lg:hidden">
          <div className="px-4 pb-6 pt-8">
            <div className="flex items-stretch gap-2">
              <span className="w-[3px] bg-[#DE141C]" />
              <div className="relative">
                <div>
                <p className="text-[12px] font-bold leading-none tracking-[0.08em] text-[#5F5F63]">DISCOVER YOUR</p>
                <h1 className="mt-1 text-[40px] font-bold leading-[0.95] text-white">DREAM<br />PROPERTY</h1>
                </div>
                <SparkleSvg showExtra className="pointer-events-none absolute -right-[145px] top-1 h-auto w-[132px]" />
              </div>
            </div>
          </div>
          <div className="relative h-[300px] w-full overflow-hidden">
            {displayedHeroProperties.map((hero, idx) => (
              !loadedHeroImages[hero.slug ?? hero.title] && idx !== heroIndex ? null : (
              <div
                key={`mobile-hero-${hero.title}`}
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  idx === heroIndex ? "scale-100 opacity-100" : "scale-105 opacity-0"
                }`}
              >
                {hero.slug ? (
                  <Link href={`/project-list/${hero.slug}`} aria-label={`View ${hero.title} project description`} className="absolute inset-0 cursor-pointer">
                    <SafeImage src={hero.image} fallbackSrc="/assets/housebanner1.webp" alt={`View ${hero.title}`} fill sizes="100vw" priority={idx === 0} quality={70} onLoad={() => setLoadedHeroImages((current) => current[hero.slug ?? hero.title] ? current : { ...current, [hero.slug ?? hero.title]: true })} className="object-cover object-center" />
                  </Link>
                ) : (
                  <SafeImage src={hero.image} fallbackSrc="/assets/housebanner1.webp" alt="" fill sizes="100vw" priority={idx === 0} quality={70} onLoad={() => setLoadedHeroImages((current) => current[hero.slug ?? hero.title] ? current : { ...current, [hero.slug ?? hero.title]: true })} className="object-cover object-center" />
                )}
              </div>
              )
            ))}
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <div className="relative inline-flex overflow-hidden">
                <button type="button" aria-label="Previous property" onClick={onPrevHero} className="grid h-10 w-10 place-items-center bg-[#DE141C] text-2xl leading-none text-white">&lsaquo;</button>
                <button type="button" aria-label="Next property" onClick={onNextHero} className="grid h-10 w-10 place-items-center bg-white text-2xl leading-none text-[#DE141C]">&rsaquo;</button>
              </div>
              <div className="bg-black/75 px-3 py-2 text-white">
                <h3 className="text-[24px] font-bold leading-[0.95]">{currentHero.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <p className="font-semibold">{currentHero.price}</p>
                  <span className="rounded bg-[#DE141C] px-2 py-0.5 text-[12px] font-bold">{currentHero.status}</span>
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
              <div key={`mobile-progress-${heroIndex}`} className="hero-progress-fill h-full bg-[#DE141C]" style={{ animationDuration: `${HERO_DURATION_MS}ms` }} />
            </div>
          </div>
          <div className="bg-black px-[15px] pb-[15px] pt-3">
            <button
              type="button"
              aria-expanded={isMobileHeroFiltersOpen}
              aria-controls="mobile-hero-property-filters"
              onClick={() => setIsMobileHeroFiltersOpen((open) => !open)}
              className="group flex min-h-[54px] w-full items-center justify-between rounded-md border border-white/15 bg-[#222222] px-3.5 text-left text-white transition-colors hover:border-white/25 hover:bg-[#292929] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-[#DE141C] shadow-sm shadow-[#DE141C]/20">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" aria-hidden="true">
                    <path d="M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <span>
                  <span className="block text-xs font-semibold tracking-[0.01em]">Filter properties</span>
                  <span className="mt-0.5 block truncate text-[10px] text-white/55">
                    {mobileHeroActiveFilterCount ? `${mobileHeroActiveFilterCount} filter${mobileHeroActiveFilterCount === 1 ? "" : "s"} selected` : "Set location, price and property details"}
                  </span>
                </span>
              </span>
              <svg viewBox="0 0 24 24" className={`ml-3 h-4 w-4 shrink-0 text-white/55 transition-transform duration-200 group-hover:text-white/80 ${isMobileHeroFiltersOpen ? "rotate-180" : ""}`} fill="none" aria-hidden="true">
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              id="mobile-hero-property-filters"
              aria-hidden={!isMobileHeroFiltersOpen}
              className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out ${isMobileHeroFiltersOpen ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"}`}
            >
              <div className="min-h-0 overflow-hidden">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitHeroSearch();
            }}
            className="space-y-2 pt-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  value={heroSearchFilters.location}
                  onChange={(e) => updateHeroSearchFilter("location", e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-6 text-xs text-[#D0D0D0] outline-none focus-border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
                >
                  <option value="">Location</option>
                  {provinceOptions.map((province) => <option key={province} value={province}>{province}</option>)}
                </select>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/80" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="relative">
                <select
                  value={heroSearchFilters.subLocation}
                  onChange={(e) => updateHeroSearchFilter("subLocation", e.target.value)}
                  disabled={!heroSearchFilters.location}
                  className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-6 text-xs text-[#D0D0D0] outline-none focus-border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
                >
                  <option value="">{heroSearchFilters.location ? "All municipalities" : "Select province first"}</option>
                  {municipalityOptions.map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}
                </select>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/80" fill="none" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="relative">
                <select
                  value={heroSearchFilters.baths}
                  onChange={(e) => updateHeroSearchFilter("baths", e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-6 text-xs text-[#D0D0D0] outline-none focus-border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
                >
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
                <select
                  value={heroSearchFilters.status}
                  onChange={(e) => updateHeroSearchFilter("status", e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-6 text-xs text-[#D0D0D0] outline-none focus-border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
                >
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
                <select
                  value={heroSearchFilters.guests}
                  onChange={(e) => updateHeroSearchFilter("guests", e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-6 text-xs text-[#D0D0D0] outline-none focus-border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
                >
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
                <select
                  value={heroSearchFilters.beds}
                  onChange={(e) => updateHeroSearchFilter("beds", e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-white/20 bg-[#2A2A2A]/85 px-4 pr-6 text-xs text-[#D0D0D0] outline-none focus-border-[#DE141C] focus-visible:ring-2 focus-visible:ring-[#DE141C]"
                >
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
                <p className="mb-1 text-[12px] text-white/60">{priceRangeLabel}</p>
                <input
                  aria-label="Maximum price"
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
                <p className="mb-1 text-[12px] text-white/60">Area (120-{areaMax})</p>
                <input
                  aria-label="Maximum area"
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
            <button type="submit" className="mt-1 h-10 w-full rounded-md bg-[#DE141C] text-xs font-semibold text-white">
              Search Property
            </button>
          </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ServiceShowcase />

      <div className="grid grid-cols-3 border-y py-4 text-center">
        {displayedStats.slice(0, 3).map((stat) => (
          <div key={stat.key} className="flex flex-col items-center justify-center"><p className="text-2xl font-semibold sm:text-4xl"><CountUpOnView end={stat.value} /><span className="text-[#DE141C]">{stat.suffix ?? ""}</span></p><p className="text-[13px] sm:text-sm">{stat.label}</p></div>
        ))}
      </div>

      {displayedLogos.length > 0 ? (
        <section className="border-b py-10">
          <LogoLoop
            logos={displayedLogos}
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
      ) : null}

      <HomeDiscoverySection
        hotPicks={featuredProperties}
        refreshesAt={featuredRefreshesAt}
        onRefresh={refreshFeaturedProperties}
      />

      <MeetAgents agents={homeContent?.agents?.length ? homeContent.agents : undefined} />

      <section className="border-y px-4 py-12 text-center sm:px-6 sm:py-16">
        <p className="text-sm font-bold text-gray-500">WHAT OUR CLIENTS SAY</p>
        <h2 className="text-3xl font-bold sm:text-4xl">TESTIMONIALS</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="mt-8">
          <DeferredTestimonial />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-28">
        <p className="text-center text-sm font-bold text-gray-500">KNOW US BETTER</p>
        <h2 className="text-center text-3xl font-bold sm:text-4xl">BROWSE OUR GALLERY</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="mt-8 grid grid-cols-3 gap-2">
          <Link href="/gallery?section=achievements" className="group relative block h-[22rem] overflow-hidden sm:h-[26rem] lg:h-[30rem]" aria-label="Open gallery achievements">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=800&q=80')" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
            <div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-5 sm:left-5 sm:gap-3">
              <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
              <div className="min-w-0 max-w-full">
                <p className="whitespace-nowrap text-[clamp(8px,2.4vw,13px)] font-bold leading-tight tracking-[-0.045em] sm:text-4xl sm:tracking-normal lg:text-5xl">ACHIEVEMENTS</p>
                <p className="mt-1 max-w-full break-words text-[6px] font-semibold uppercase leading-tight tracking-[0.02em] sm:text-xs sm:tracking-normal lg:text-sm">SEE OUR MILESTONES</p>
              </div>
            </div>
          </Link>
          <div className="col-span-2 space-y-2">
            <Link href="/gallery?section=events" className="group relative block h-[10.75rem] overflow-hidden sm:h-[12.5rem] lg:h-[14.75rem]" aria-label="Open gallery events">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80')" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
              <div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-4 sm:left-5 sm:gap-3">
                <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
                <div className="min-w-0 max-w-full">
                  <p className="text-[clamp(9px,3vw,13px)] font-bold leading-tight sm:text-4xl lg:text-5xl">EVENTS</p>
                  <p className="mt-1 max-w-full break-words text-[6px] font-semibold uppercase leading-tight tracking-[0.02em] sm:text-xs sm:tracking-normal lg:text-sm">MEMORABLE TIMES</p>
                </div>
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/gallery?section=trainings" className="group relative block h-[10.75rem] overflow-hidden sm:h-[12.5rem] lg:h-[14.75rem]" aria-label="Open gallery trainings">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&q=80')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
                <div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-4 sm:left-4 sm:gap-3">
                  <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
                  <div className="min-w-0 max-w-full">
                    <p className="text-[clamp(9px,3vw,13px)] font-bold leading-tight sm:text-4xl lg:text-5xl">TRAININGS</p>
                    <p className="mt-1 max-w-full break-words text-[6px] font-semibold uppercase leading-tight tracking-[0.02em] sm:text-xs sm:tracking-normal lg:text-sm">ENHANCING OUR SKILLS</p>
                  </div>
                </div>
              </Link>
              <Link href="/gallery?section=service" className="group relative block h-[10.75rem] overflow-hidden sm:h-[12.5rem] lg:h-[14.75rem]" aria-label="Open gallery service">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&q=80')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
                <div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-4 sm:left-4 sm:gap-3">
                  <span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
                  <div className="min-w-0 max-w-full">
                    <p className="text-[clamp(9px,3vw,13px)] font-bold leading-tight sm:text-4xl lg:text-5xl">SERVICE</p>
                    <p className="mt-1 max-w-full break-words text-[6px] font-semibold uppercase leading-tight tracking-[0.02em] sm:text-xs sm:tracking-normal lg:text-sm">FOR THE PEOPLE</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
