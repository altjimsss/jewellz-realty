"use client";

import { useMemo, useState } from "react";
import { Poppins } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyBanner } from "@/components/layout/PropertyBanner";
import { PropertyFilters, type PropertyFiltersState } from "../../../components/properties/PropertyFilters";
import { PropertyGrid } from "@/components/properties/PropertyGrid";
import { PropertyMapPreview } from "@/components/properties/PropertyMapPreview";
import { SAMPLE_PROPERTIES } from "@/lib/sample-properties";

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

type SampleProperty = (typeof SAMPLE_PROPERTIES)[number];

function getFilteredProperties(
  properties: SampleProperty[],
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
  const filteredProperties = useMemo(() => {
    return getFilteredProperties(SAMPLE_PROPERTIES, activeCategory, appliedFilters);
  }, [activeCategory, appliedFilters]);

  const submittedLocation = appliedFilters.location.trim().toLowerCase();
  const hasMatchingLocation =
    submittedLocation !== "" &&
    filteredProperties.some((property) => {
      const propertyLocation = (property.location ?? "").toLowerCase();
      return Boolean(property.coordinates) && propertyLocation.includes(submittedLocation);
    });

  const primaryProperty = filteredProperties[0] ?? null;
  const showMapPreview = hasSearched && hasMatchingLocation && Boolean(primaryProperty);

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

      <PropertyBanner />

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