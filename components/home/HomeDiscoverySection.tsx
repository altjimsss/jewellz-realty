"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPHPWhole } from "@/lib/currency";
import type { Property } from "@/types/property";
import { ProjectListCard } from "@/components/properties/ProjectListCard";

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
] as const;

type HomeDiscoverySectionProps = {
  hotPicks?: Property[];
  refreshesAt?: string | null;
  onRefresh?: () => void | Promise<void>;
};

function secondsUntilRefresh(refreshesAt?: string | null) {
  if (!refreshesAt) return 86400;
  const refreshTime = new Date(refreshesAt).getTime();
  if (!Number.isFinite(refreshTime)) return 86400;
  return Math.max(0, Math.floor((refreshTime - Date.now()) / 1000));
}

function HotPickCountdown({ refreshesAt, onRefresh }: { refreshesAt?: string | null; onRefresh?: () => void | Promise<void> }) {
  const [total, setTotal] = useState(86400);
  const refreshedAtZeroRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = secondsUntilRefresh(refreshesAt);
      if (next === 0 && !refreshedAtZeroRef.current) {
        refreshedAtZeroRef.current = true;
        void onRefresh?.();
      }
      if (next > 0) refreshedAtZeroRef.current = false;
      setTotal(next);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onRefresh, refreshesAt]);

  const days = String(Math.floor(total / 86400)).padStart(2, "0");
  const hours = String(Math.floor((total % 86400) / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");

  return (
    <div className="hidden items-end gap-5 lg:flex">
      <div><p className="text-[10px] font-semibold uppercase text-black/70">Days</p><p className="text-3xl font-bold leading-none">{days}</p></div>
      <span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
      <div><p className="text-[10px] font-semibold uppercase text-black/70">Hours</p><p className="text-3xl font-bold leading-none">{hours}</p></div>
      <span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
      <div><p className="text-[10px] font-semibold uppercase text-black/70">Minutes</p><p className="text-3xl font-bold leading-none">{minutes}</p></div>
      <span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
      <div><p className="text-[10px] font-semibold uppercase text-black/70">Seconds</p><p className="text-3xl font-bold leading-none">{seconds}</p></div>
    </div>
  );
}

export default function HomeDiscoverySection({ hotPicks = [], refreshesAt, onRefresh }: HomeDiscoverySectionProps) {
  const [hotPicksPage, setHotPicksPage] = useState(0);
  const [hotPicksLoading, setHotPicksLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const hotPicksPerPage = 6;
  const activeHotPicks = hotPicks;
  const hotPicksPageCount = Math.max(1, Math.ceil(activeHotPicks.length / hotPicksPerPage));
  const currentHotPicksPage = Math.min(hotPicksPage, hotPicksPageCount - 1);
  const visibleHotPicks = activeHotPicks.slice(currentHotPicksPage * hotPicksPerPage, currentHotPicksPage * hotPicksPerPage + hotPicksPerPage);

  const changeHotPicksPage = (direction: "prev" | "next") => {
    if (hotPicksLoading) return;

    setHotPicksLoading(true);
    const nextPage =
      direction === "prev"
        ? (currentHotPicksPage - 1 + hotPicksPageCount) % hotPicksPageCount
        : (currentHotPicksPage + 1) % hotPicksPageCount;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setHotPicksPage(nextPage);
      setHotPicksLoading(false);
    }, 220);
  };

  return (
    <>
      <section className="px-4 pb-8 pt-6 sm:px-6 sm:py-16 lg:px-28">
        <div className="relative lg:col-span-2">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-3 sm:gap-10">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">TODAY&apos;S</p>
                <h2 className="mt-1 text-2xl font-semibold leading-none tracking-[-0.035em] text-[#1C1B19] sm:text-3xl">Hot picks</h2>
                <div className="mt-3 h-[2px] w-10 bg-[#DE141C]" />
              </div>
              <HotPickCountdown refreshesAt={refreshesAt} onRefresh={onRefresh} />
            </div>
            <div className="ml-auto flex items-center justify-end">
              <button type="button" onClick={() => changeHotPicksPage("prev")} disabled={hotPicksLoading} className="grid h-9 w-8 place-items-center border border-black/10 bg-white text-lg leading-none text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
                &lsaquo;
              </button>
              <button type="button" onClick={() => changeHotPicksPage("next")} disabled={hotPicksLoading} className="grid h-9 w-8 place-items-center bg-[#DE141C] text-lg leading-none text-white disabled:cursor-not-allowed disabled:opacity-50">
                &rsaquo;
              </button>
              <Link href="/project-list" className="inline-flex h-9 items-center bg-black px-5 text-xs font-semibold text-white">View All</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 md:grid-cols-3">
            {hotPicksLoading ? Array.from({ length: hotPicksPerPage }).map((_, index) => (
              <article key={`hotpick-skeleton-${index}`} className="overflow-hidden bg-white">
                <div className="aspect-[4/3] animate-pulse bg-[#E7E7E7]" />
                <div className="border-b border-[#EAE7E3] px-1 pb-3 pt-3.5">
                  <div className="h-4 w-[78%] animate-pulse bg-[#E5E5E5]" />
                  <div className="mt-2 h-3 w-[55%] animate-pulse bg-[#F0EEEB]" />
                  <div className="mt-4 h-4 w-24 animate-pulse bg-[#F0EEEB]" />
                  <div className="mt-3 h-5 w-28 animate-pulse bg-[#E5E5E5]" />
                </div>
              </article>
            )) : visibleHotPicks.map((pick) => (
              <ProjectListCard
                key={pick.id}
                property={pick}
                priceLabel={formatPHPWhole(pick.price)}
                href={`/project-list/${pick.slug}`}
              />
            ))}
            {!hotPicksLoading && hotPicks.length === 0 ? (
              <p className="col-span-full py-10 text-center text-sm text-black/55">
                No properties are available yet. Check back soon.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-y border-[#EAE7E3] px-4 py-12 sm:px-6 sm:py-16 lg:px-28">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">FIND YOUR WAY EASIER</p>
        <h2 className="mt-1 text-center text-2xl font-semibold tracking-[-0.035em] text-[#1C1B19] sm:text-3xl">Browse categories</h2>
        <div className="mx-auto mt-3 h-[2px] w-10 bg-[#DE141C]" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 md:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.label}
              href={`/project-list?category=${encodeURIComponent(category.label)}`}
              className={`group flex h-24 flex-col items-center justify-center gap-1.5 border border-[#EAE7E3] transition-colors duration-200 sm:h-36 sm:gap-2 ${
                category.label === "Memorial" ? "col-span-2 mx-auto w-[48%] sm:col-span-1 sm:w-full" : ""
              } bg-white text-[#1C1B19] hover:border-[#DE141C] hover:bg-[#F7F6F4] hover:text-[#DE141C]`}
            >
              <span className="scale-90 sm:scale-100">{category.icon}</span>
              <span className="text-xs font-semibold sm:text-sm">{category.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
