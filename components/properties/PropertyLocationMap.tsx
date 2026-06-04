"use client";

import { useState } from "react";
import { PropertyMapPreview } from "@/components/properties/PropertyMapPreview";
import type { NearbyPlaceGroup } from "@/lib/nearby-places";
import { formatDistance } from "@/lib/nearby-places";
import type { Property } from "@/types/property";

type NearbyCategory = {
  label: string;
  icon: React.ReactNode;
};

const nearbyCategoryTabs: NearbyCategory[] = [
  {
    label: "Education",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M12 3L2 8l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 8v6M22 8v6M6 10.5v5a6 6 0 0012 0v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Health",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Food",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 2v6M10 2v6M14 2v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Culture",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M16 10v11M12 10v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

type PropertyLocationMapProps = {
  property: Property;
  nearbyGroups: NearbyPlaceGroup[];
  onInteraction?: (event: string, metadata?: Record<string, unknown>) => void;
};

export function PropertyLocationMap({ property, nearbyGroups, onInteraction }: PropertyLocationMapProps) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [focusedNearbyPlace, setFocusedNearbyPlace] = useState<NearbyPlaceGroup["places"][number] | null>(null);

  const active = nearbyCategoryTabs[activeTab];
  const activePlaces = nearbyGroups.find((group) => group.category === active.label)?.places ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsMapOpen((current) => {
            const nextOpen = !current;
            if (nextOpen) onInteraction?.("property_map_open");
            return nextOpen;
          });
        }}
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
          <PropertyMapPreview properties={[property]} mapHeightClassName="h-[400px]" focusedNearbyPlace={focusedNearbyPlace} />
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
    {nearbyCategoryTabs.map((category, index) => {
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
    {activePlaces.length === 0 ? (
      <div className="px-4 py-3 text-sm text-black/50">
        No nearby {active.label.toLowerCase()} places found from OpenStreetMap.
      </div>
    ) : null}
    {activePlaces.map((item) => (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setFocusedNearbyPlace((current) => current?.id === item.id ? null : item);
          setIsMapOpen(true);
          onInteraction?.("property_nearby_click", { category: active.label, placeName: item.name, distanceMeters: item.distanceMeters });
        }}
        className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-red-50 ${focusedNearbyPlace?.id === item.id ? "bg-red-50" : ""}`}
      >
        <span className="min-w-0 truncate text-sm text-black/80">{item.name}</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#DE141C]" aria-hidden="true" />
          <span className="shrink-0 text-xs font-medium text-black/50">{formatDistance(item.distanceMeters)}</span>
        </div>
      </button>
    ))}
  </div>
</div>
    </>
  );
}
