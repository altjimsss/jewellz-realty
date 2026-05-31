"use client";

import { useEffect, useRef, useState } from "react";

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

export default function HomeDiscoverySection() {
  const [total, setTotal] = useState(3 * 86400 + 23 * 3600 + 19 * 60 + 56);
  const [activeCat, setActiveCat] = useState("");
  const [hotPicksPage, setHotPicksPage] = useState(0);
  const [hotPicksLoading, setHotPicksLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setTotal((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const days = String(Math.floor(total / 86400)).padStart(2, "0");
  const hours = String(Math.floor((total % 86400) / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");

  const hotPicksPerPage = 6;
  const hotPicksPageCount = Math.ceil(hotPicks.length / hotPicksPerPage);
  const visibleHotPicks = hotPicks.slice(hotPicksPage * hotPicksPerPage, hotPicksPage * hotPicksPerPage + hotPicksPerPage);

  const changeHotPicksPage = (direction: "prev" | "next") => {
    if (hotPicksLoading) return;

    setHotPicksLoading(true);
    const nextPage =
      direction === "prev"
        ? (hotPicksPage - 1 + hotPicksPageCount) % hotPicksPageCount
        : (hotPicksPage + 1) % hotPicksPageCount;

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
      <section className="grid gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-28">
        <div className="md:hidden">
          <h2 className="mb-2 text-2xl font-semibold">Welcome to <span className="text-[#DE141C]">Jewellz Realty</span></h2>
          <p className="text-sm leading-7">
            We help buyers, sellers, and investors make confident decisions with reliable market guidance and end-to-end support.
          </p>
        </div>
        <div className="relative lg:col-span-2">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-3 sm:gap-10">
              <div>
                <p className="text-xs font-bold tracking-wide text-gray-500">TODAY&apos;S</p>
                <h2 className="text-3xl font-bold leading-none sm:text-4xl">HOT PICKS</h2>
                <div className="mt-2 h-[3px] w-16 bg-[#DE141C]" />
              </div>
              <div className="hidden items-end gap-5 lg:flex">
                <div><p className="text-[10px] font-semibold uppercase text-black/70">Days</p><p className="text-3xl font-bold leading-none">{days}</p></div>
                <span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
                <div><p className="text-[10px] font-semibold uppercase text-black/70">Hours</p><p className="text-3xl font-bold leading-none">{hours}</p></div>
                <span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
                <div><p className="text-[10px] font-semibold uppercase text-black/70">Minutes</p><p className="text-3xl font-bold leading-none">{minutes}</p></div>
                <span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
                <div><p className="text-[10px] font-semibold uppercase text-black/70">Seconds</p><p className="text-3xl font-bold leading-none">{seconds}</p></div>
              </div>
            </div>
            <div className="ml-auto flex items-center justify-end">
              <button
                onClick={() => changeHotPicksPage("prev")}
                disabled={hotPicksLoading}
                className="grid h-9 w-8 place-items-center border border-black/10 bg-white text-lg leading-none text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                ‹
              </button>
              <button
                onClick={() => changeHotPicksPage("next")}
                disabled={hotPicksLoading}
                className="grid h-9 w-8 place-items-center bg-[#DE141C] text-lg leading-none text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                ›
              </button>
              <button className="h-9 bg-black px-5 text-xs font-semibold text-white">View All</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {hotPicksLoading ? Array.from({ length: hotPicksPerPage }).map((_, index) => (
              <article key={`hotpick-skeleton-${index}`} className="overflow-hidden bg-white shadow-sm">
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
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => changeHotPicksPage("prev")}
              disabled={hotPicksLoading}
              className="grid h-9 w-8 place-items-center border border-black/10 bg-white text-lg leading-none text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              ‹
            </button>
            <button
              onClick={() => changeHotPicksPage("next")}
              disabled={hotPicksLoading}
              className="grid h-9 w-8 place-items-center bg-[#DE141C] text-lg leading-none text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      <section className="border-y px-4 py-12 sm:px-6 sm:py-16 lg:px-28">
        <p className="text-center text-sm font-bold text-gray-500">FIND YOUR WAY EASIER</p>
        <h2 className="text-center text-3xl font-bold sm:text-4xl">BROWSE CATEGORIES</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 md:grid-cols-5">
          {categories.map((category) => (
            <button
              key={category.label}
              onClick={() => setActiveCat(category.label)}
              className={`group flex h-24 flex-col items-center justify-center gap-1.5 rounded border transition-all duration-200 sm:h-36 sm:gap-2 ${
                category.label === "Memorial" ? "col-span-2 mx-auto w-[48%] sm:col-span-1 sm:w-full" : ""
              } ${
                activeCat === category.label
                  ? "border-[#DE141C] bg-[#DE141C] text-white"
                  : "border-black/10 bg-white text-black hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white"
              }`}
            >
              <span className="scale-90 sm:scale-100">{category.icon}</span>
              <span className="text-xs font-semibold sm:text-sm">{category.label}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}