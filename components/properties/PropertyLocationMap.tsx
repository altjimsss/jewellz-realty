"use client";

import { useState } from "react";
import { PropertyMapPreview } from "@/components/properties/PropertyMapPreview";
import type { Property } from "@/types/property";

type NearbyItem = {
  name: string;
  distance: number;
};

type NearbyCategory = {
  label: string;
  icon: React.ReactNode;
  items: NearbyItem[];
};

function formatDistance(miles: number): string {
  const meters = miles * 1609.34;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

const nearbyCategories: NearbyCategory[] = [
  {
    label: "Education",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M12 3L2 8l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 8v6M22 8v6M6 10.5v5a6 6 0 0012 0v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    items: [
      { name: "Allen Academy", distance: 0.089 },
      { name: "St. Joseph School", distance: 0.028 },
      { name: "George Washington School", distance: 0.059 },
    ],
  },
  {
    label: "Health",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    items: [
      { name: "Batangas Medical Center", distance: 0.045 },
      { name: "City Health Clinic", distance: 0.031 },
      { name: "Rose Pharmacy", distance: 0.012 },
    ],
  },
  {
    label: "Food",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 2v6M10 2v6M14 2v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    items: [
      { name: "Jollibee Batangas", distance: 0.102 },
      { name: "SM Supermarket", distance: 0.075 },
      { name: "Mang Inasal", distance: 0.034 },
    ],
  },
  {
    label: "Culture",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M16 10v11M12 10v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    items: [
      { name: "Batangas City Plaza", distance: 0.210 },
      { name: "Heritage Museum", distance: 0.183 },
      { name: "St. Patrick Parish Church", distance: 0.094 },
    ],
  },
];

type PropertyLocationMapProps = {
  property: Property;
};

export function PropertyLocationMap({ property }: PropertyLocationMapProps) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const active = nearbyCategories[activeTab];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMapOpen((current) => !current)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#DE141C]/30 bg-[#DE141C]/5 px-3 py-1 text-xs font-semibold text-[#DE141C] transition-colors hover:bg-[#DE141C]/10"
        aria-expanded={isMapOpen}
        aria-controls="property-location-map"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
          <path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 4v13M15 7v13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {isMapOpen ? "Close map" : "Open map"}
      </button>

      {isMapOpen && (
        <div id="property-location-map" className="mt-3 w-full overflow-hidden rounded-[10px] border border-black/10">
          <PropertyMapPreview properties={[property]} mapHeightClassName="h-[400px]" />
        </div>
      )}

     {/* What's Nearby */}
 {/* What's Nearby */}
<div className="mt-4 w-full pl-6">
  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-black/40">
    What&apos;s nearby
  </p>

  {/* Tabs */}
  <div className="flex flex-wrap gap-2">
    {nearbyCategories.map((category, index) => {
      const isActive = activeTab === index;
      return (
        <button
          key={category.label}
          type="button"
          onClick={() => setActiveTab(index)}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
            isActive
              ? "border-[#DE141C] bg-[#DE141C] text-white"
              : "border-black/15 bg-white text-black hover:border-black/30"
          }`}
        >
          {category.icon}
          {category.label}
        </button>
      );
    })}
  </div>

  {/* Items list */}
  <div className="mt-3 divide-y divide-black/8 rounded-[12px] border border-black/10">
    {active.items.map((item) => (
      <div key={item.name} className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-black/80">{item.name}</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#DE141C]" aria-hidden="true" />
          <span className="text-xs font-medium text-black/50">{formatDistance(item.distance)}</span>
        </div>
      </div>
    ))}
  </div>
</div>
    </>
  );
}