"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
const AGENTS_AUTO_SLIDE_MS = 2600;
const agents = [
  { name: "CINDY HERMOSO", top: true },
  { name: "JOHN A. SMITH", top: false },
  { name: "LINDA WALKER", top: false },
  { name: "EVAN YU", top: false },
];
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

function SparkleSvg({ className = "", showExtra = false }: { className?: string; showExtra?: boolean }) {
  return (
    <svg
      width="254"
      height="192"
      viewBox="0 0 254 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M97.9733 50.1845C99.6027 50.278 100.836 51.6383 100.953 53.6089C100.942 54.4804 100.817 55.4226 100.529 56.229C98.472 62.0578 96.4146 67.8872 94.1735 73.6725C93.2888 76.1836 92.1502 78.5378 91.125 80.8213C89.8804 80.3331 89.8211 79.3476 89.8327 78.4761C89.9646 76.2727 90.005 74.0472 90.5049 71.9309C91.3042 68.1365 92.3091 64.2937 93.2221 60.4291C93.7873 58.0367 94.3742 55.5518 94.8473 53.1377C95.3256 51.1137 96.3441 50.0911 97.9733 50.1845ZM111.858 47.3445C120.664 49.1336 129.428 51.1064 137.995 53.9076C138.179 53.9512 138.342 54.087 138.504 54.2225L138.373 54.7747C136.63 54.7514 134.751 54.8904 133.073 54.5912C126.02 53.605 119.059 52.64 112.049 51.4698C110.923 51.3009 109.699 50.7201 108.796 50.0209C107.547 49.1428 107.986 47.6931 109.426 47.3532C110.249 47.159 111.121 47.1706 111.858 47.3445ZM73.3313 29.8874C74.4138 30.2403 75.4749 30.686 76.5573 31.0388C82.9164 33.3183 89.1836 35.5755 95.5427 37.855C96.2571 38.1209 96.8578 38.4578 97.5722 38.7237C97.4152 38.9777 97.3714 39.1615 97.328 39.3454C94.064 38.7686 90.7345 38.4679 87.5357 37.6151C83.0271 36.5499 78.4913 35.187 74.0261 33.9379C73.2903 33.764 72.5978 33.4063 71.9974 33.0703C71.1425 32.5769 70.7639 31.7101 71.1869 30.7415C71.5882 29.8649 72.4113 29.6702 73.3313 29.8874ZM118.382 9.44259C118.75 9.52982 119.085 10.5801 119.047 11.1539C118.97 12.3015 118.687 13.4978 118.474 14.8077C117.877 16.5125 117.28 18.2178 116.775 19.9443C115.7 23.6732 114.739 27.3319 113.663 31.0608C113.245 32.4192 112.736 33.7563 111.971 34.9358C111.185 36.2072 110.004 37.0938 108.348 36.7028C106.692 36.3115 106.124 35.0117 105.898 33.501C105.565 30.7993 106.265 28.2443 107.426 25.7983C109.39 21.599 111.424 17.5133 113.641 13.4713C114.336 12.1781 115.398 10.9717 116.416 9.94945C116.801 9.55459 117.83 9.31216 118.382 9.44259Z" fill="white">
        <animate attributeName="opacity" values="0.45;1;0.45" dur="2.2s" begin="0s" repeatCount="indefinite" />
      </path>
      <path d="M203.973 151.185C205.603 151.278 206.836 152.638 206.953 154.609C206.942 155.48 206.817 156.423 206.529 157.229C204.472 163.058 202.415 168.887 200.173 174.673C199.289 177.184 198.15 179.538 197.125 181.821C195.88 181.333 195.821 180.348 195.833 179.476C195.965 177.273 196.005 175.047 196.505 172.931C197.304 169.137 198.309 165.294 199.222 161.429C199.787 159.037 200.374 156.552 200.847 154.138C201.326 152.114 202.344 151.091 203.973 151.185ZM217.858 148.345C226.664 150.134 235.428 152.106 243.995 154.908C244.179 154.951 244.342 155.087 244.504 155.222L244.373 155.775C242.63 155.751 240.751 155.89 239.073 155.591C232.02 154.605 225.059 153.64 218.049 152.47C216.923 152.301 215.699 151.72 214.796 151.021C213.547 150.143 213.986 148.693 215.426 148.353C216.249 148.159 217.121 148.171 217.858 148.345ZM179.331 130.887C180.414 131.24 181.475 131.686 182.557 132.039C188.916 134.318 195.184 136.576 201.543 138.855C202.257 139.121 202.858 139.458 203.572 139.724C203.415 139.978 203.371 140.162 203.328 140.345C200.064 139.769 196.734 139.468 193.536 138.615C189.027 137.55 184.491 136.187 180.026 134.938C179.29 134.764 178.598 134.406 177.997 134.07C177.143 133.577 176.764 132.71 177.187 131.741C177.588 130.865 178.411 130.67 179.331 130.887ZM224.382 110.443C224.75 110.53 225.085 111.58 225.047 112.154C224.97 113.302 224.687 114.498 224.474 115.808C223.877 117.513 223.28 119.218 222.775 120.944C221.7 124.673 220.739 128.332 219.663 132.061C219.245 133.419 218.736 134.756 217.971 135.936C217.185 137.207 216.004 138.094 214.348 137.703C212.692 137.311 212.124 136.012 211.898 134.501C211.565 131.799 212.265 129.244 213.426 126.798C215.39 122.599 217.424 118.513 219.641 114.471C220.336 113.178 221.398 111.972 222.416 110.949C222.801 110.555 223.83 110.312 224.382 110.443Z" fill="white">
        <animate attributeName="opacity" values="0.45;1;0.45" dur="2.2s" begin="0.35s" repeatCount="indefinite" />
      </path>
      <path d="M28.3828 77.2634C29.3661 76.7583 30.5459 77.0758 31.2804 78.105C31.5682 78.582 31.8139 79.1359 31.9183 79.6716C32.6866 83.5362 33.4549 87.4013 34.1009 91.3051C34.4327 92.9694 34.5626 94.6354 34.7355 96.2243C33.8437 96.3839 33.4764 95.8692 33.1887 95.3924C32.5212 94.1518 31.7926 92.9301 31.3695 91.6111C30.5542 89.2798 29.8427 86.8519 29.07 84.4436C28.5917 82.9527 28.0946 81.4043 27.5552 79.9329C27.1505 78.6714 27.3998 77.7687 28.3828 77.2634ZM35.5324 70.9853C41.2805 68.9515 47.0657 67.0326 53.0162 65.6296C53.1383 65.5905 53.2788 65.6083 53.4193 65.6264L53.5296 65.9705C52.5037 66.5526 51.4536 67.2696 50.3725 67.6797C45.9198 69.5509 41.5273 71.4021 37.0378 73.1587C36.3233 73.451 35.4133 73.5539 34.6496 73.4828C33.6229 73.4327 33.3894 72.495 34.1159 71.8192C34.5309 71.4332 35.0438 71.1421 35.5324 70.9853ZM7.13229 74.6568C7.88373 74.479 8.65371 74.3588 9.40514 74.181C13.8895 73.2483 18.3128 72.3352 22.7971 71.4025C23.3042 71.3031 23.7688 71.2808 24.2758 71.1814C24.27 71.373 24.3066 71.4882 24.3434 71.6028C22.2424 72.4033 20.1965 73.3758 18.0403 74.0044C15.0471 74.9647 11.937 75.772 8.90693 76.6176C8.4183 76.7744 7.89284 76.8171 7.42849 76.8396C6.7625 76.8636 6.24847 76.5221 6.16818 75.8523C6.10638 75.2396 6.52144 74.8528 7.13229 74.6568ZM26.5352 48.1931C26.7795 48.1147 27.3305 48.5708 27.5019 48.8952C27.8448 49.5441 28.084 50.2897 28.4026 51.0728C28.63 52.2015 28.8577 53.3301 29.1462 54.4392C29.7783 56.8296 30.4527 59.1434 31.0848 61.5338C31.2997 62.4135 31.4529 63.3127 31.4051 64.2135C31.3756 65.1715 30.986 66.0553 29.8867 66.4082C28.7871 66.7609 28.0165 66.2493 27.374 65.5067C26.2665 64.1544 25.8126 62.5295 25.664 60.8063C25.3918 57.8577 25.1983 54.9463 25.1278 51.9963C25.0962 51.0579 25.3093 50.0412 25.5588 49.1392C25.65 48.7937 26.1687 48.3108 26.5352 48.1931Z" fill="white">
        <animate attributeName="opacity" values="0.45;1;0.45" dur="2.2s" begin="0.7s" repeatCount="indefinite" />
      </path>
      {showExtra && (
        <path d="M97.9733 50.1845C99.6027 50.278 100.836 51.6383 100.953 53.6089C100.942 54.4804 100.817 55.4226 100.529 56.229C98.472 62.0578 96.4146 67.8872 94.1735 73.6725C93.2888 76.1836 92.1502 78.5378 91.125 80.8213C89.8804 80.3331 89.8211 79.3476 89.8327 78.4761C89.9646 76.2727 90.005 74.0472 90.5049 71.9309C91.3042 68.1365 92.3091 64.2937 93.2221 60.4291C93.7873 58.0367 94.3742 55.5518 94.8473 53.1377C95.3256 51.1137 96.3441 50.0911 97.9733 50.1845ZM111.858 47.3445C120.664 49.1336 129.428 51.1064 137.995 53.9076C138.179 53.9512 138.342 54.087 138.504 54.2225L138.373 54.7747C136.63 54.7514 134.751 54.8904 133.073 54.5912C126.02 53.605 119.059 52.64 112.049 51.4698C110.923 51.3009 109.699 50.7201 108.796 50.0209C107.547 49.1428 107.986 47.6931 109.426 47.3532C110.249 47.159 111.121 47.1706 111.858 47.3445ZM73.3313 29.8874C74.4138 30.2403 75.4749 30.686 76.5573 31.0388C82.9164 33.3183 89.1836 35.5755 95.5427 37.855C96.2571 38.1209 96.8578 38.4578 97.5722 38.7237C97.4152 38.9777 97.3714 39.1615 97.328 39.3454C94.064 38.7686 90.7345 38.4679 87.5357 37.6151C83.0271 36.5499 78.4913 35.187 74.0261 33.9379C73.2903 33.764 72.5978 33.4063 71.9974 33.0703C71.1425 32.5769 70.7639 31.7101 71.1869 30.7415C71.5882 29.8649 72.4113 29.6702 73.3313 29.8874ZM118.382 9.44259C118.75 9.52982 119.085 10.5801 119.047 11.1539C118.97 12.3015 118.687 13.4978 118.474 14.8077C117.877 16.5125 117.28 18.2178 116.775 19.9443C115.7 23.6732 114.739 27.3319 113.663 31.0608C113.245 32.4192 112.736 33.7563 111.971 34.9358C111.185 36.2072 110.004 37.0938 108.348 36.7028C106.692 36.3115 106.124 35.0117 105.898 33.501C105.565 30.7993 106.265 28.2443 107.426 25.7983C109.39 21.599 111.424 17.5133 113.641 13.4713C114.336 12.1781 115.398 10.9717 116.416 9.94945C116.801 9.55459 117.83 9.31216 118.382 9.44259Z" fill="white" transform="translate(136 2) scale(0.72) rotate(16 110 50)">
          <animate attributeName="opacity" values="0.35;1;0.35" dur="2.2s" begin="1.05s" repeatCount="indefinite" />
        </path>
      )}
    </svg>
  );
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hotPicksPage, setHotPicksPage] = useState(0);
  const [hotPicksLoading, setHotPicksLoading] = useState(false);
  const [agentsAutoPaused, setAgentsAutoPaused] = useState(false);
  const [serviceVisualsLoaded, setServiceVisualsLoaded] = useState<boolean[]>(
    () => serviceVisuals.map(() => false)
  );
  const serviceVisualIndexRef = useRef(0);
  const serviceVisualsLoadedRef = useRef<boolean[]>(serviceVisuals.map(() => false));
  const hotPicksTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentsRailRef = useRef<HTMLDivElement | null>(null);

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

    const scrollAgents = useCallback((direction: "prev" | "next") => {
    const rail = agentsRailRef.current;
    if (!rail) return;

    const step = 280 + 24; // card width + gap-6
    const maxLeft = rail.scrollWidth - rail.clientWidth;

    if (maxLeft <= 0) return;

    const isAtStart = rail.scrollLeft <= 4;
    const isAtEnd = rail.scrollLeft >= maxLeft - 4;

    if (direction === "prev" && isAtStart) {
      rail.scrollTo({ left: maxLeft, behavior: "smooth" });
      return;
    }

    if (direction === "next" && isAtEnd) {
      rail.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    const nextLeft =
      direction === "next"
        ? Math.min(rail.scrollLeft + step, maxLeft)
        : Math.max(rail.scrollLeft - step, 0);

    rail.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (agentsAutoPaused) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      scrollAgents("next");
    }, AGENTS_AUTO_SLIDE_MS);

    return () => window.clearInterval(t);
  }, [agentsAutoPaused, scrollAgents]);

  return (
    <main className={`${poppins.className} bg-white text-[#181A20]`}>
      <div className="flex h-7 items-center justify-center gap-1 bg-black px-2 text-[10px] text-[#FAFAFA] sm:h-8 sm:gap-2 sm:text-sm">
        <p className="whitespace-nowrap">Premium but Affordable (deals) Properties on Sale.</p>
        <a className="underline" href="#">BrowseNow</a>
      </div>
      <nav className="sticky inset-x-0 top-0 z-[100] border-b border-black/10 bg-white px-4 py-3 md:px-6 lg:px-12">
        <div className="mx-auto flex max-w-[1200px] items-center">
          <div className="hidden min-w-[170px] items-center md:flex">
            <img src="/assets/jewellz-logo.png" alt="Jewellz Realty Logo" className="h-14 w-auto object-contain" />
          </div>
          <div className="flex w-full items-center gap-3 md:hidden">
            <img src="/assets/jewellz-logo.png" alt="Jewellz Realty Logo" className="h-10 w-auto object-contain" />
            <label className="relative block min-w-0 flex-1">
              <input
                type="search"
                placeholder="What are you looking for?"
                className="h-9 w-full rounded-sm border border-black/10 bg-white pl-4 pr-9 text-xs text-black placeholder:text-black/40 outline-none"
              />
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
                <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </label>
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`grid h-10 w-10 place-items-center rounded-md text-black transition-colors duration-200 ${
                mobileMenuOpen ? "bg-black/5" : ""
              }`}
            >
              <span className="relative block h-7 w-7">
                <svg
                  viewBox="0 0 24 24"
                  className={`absolute inset-0 h-7 w-7 transform-gpu transition-all duration-200 ease-out ${
                    mobileMenuOpen ? "rotate-45 opacity-0" : "rotate-0 opacity-100"
                  }`}
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <svg
                  viewBox="0 0 24 24"
                  className={`absolute inset-0 h-7 w-7 transform-gpu transition-all duration-200 ease-out ${
                    mobileMenuOpen ? "rotate-0 opacity-100" : "-rotate-45 opacity-0"
                  }`}
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </span>
            </button>
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
        <div
          className={`absolute left-0 right-0 top-full z-[110] transform-gpu md:hidden transition-all duration-200 ${
            mobileMenuOpen
              ? "pointer-events-auto translate-y-0 opacity-100 ease-out"
              : "pointer-events-none -translate-y-3 opacity-0 ease-in"
          }`}
        >
          <div
            className="relative mx-4 mt-2 overflow-hidden rounded-[20px] border border-black/10 bg-white/95 shadow-lg backdrop-blur-md"
          >
            <div className="flex flex-col p-1.5">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-lg px-2.5 py-3 text-sm font-medium transition-colors duration-150 hover:bg-[#DE141C]/10 hover:text-[#DE141C] ${
                      mobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
                    } ${
                      isActive ? "text-[#DE141C]" : "text-black/80"
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

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
                <button onClick={() => { setHeroIndex((i) => (i - 1 + heroProperties.length) % heroProperties.length); setHeroElapsed(0); }} className="grid h-10 w-10 place-items-center bg-[#DE141C] text-2xl leading-none text-white">&lsaquo;</button>
                <button onClick={() => { setHeroIndex((i) => (i + 1) % heroProperties.length); setHeroElapsed(0); }} className="grid h-10 w-10 place-items-center bg-white text-2xl leading-none text-[#DE141C]">&rsaquo;</button>
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
                <p className="mb-1 text-[10px] text-white/60">Price (0-{formatCurrency(priceMax)})</p>
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

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-24">
        <p className="text-center text-sm font-bold text-gray-500">WE HAVE PROFESSIONAL AGENTS</p>
        <h2 className="text-center text-3xl font-bold sm:text-4xl">MEET OUR AGENTS</h2>
        <div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
        <div className="relative mt-10">
          <button
            type="button"
            aria-label="Previous agents"
            onClick={() => scrollAgents("prev")}
            className="absolute left-0 top-1/2 z-20 grid h-10 w-9 -translate-y-1/2 place-items-center border border-black/10 bg-white text-lg leading-none text-black transition-colors hover:bg-black hover:text-white"
          >
            &lsaquo;
          </button>
          <button
            type="button"
            aria-label="Next agents"
            onClick={() => scrollAgents("next")}
            className="absolute right-0 top-1/2 z-20 grid h-10 w-9 -translate-y-1/2 place-items-center bg-[#DE141C] text-lg leading-none text-white"
          >
            &rsaquo;
          </button>
          <div
            ref={agentsRailRef}
            className="mx-12 overflow-x-auto scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onMouseEnter={() => setAgentsAutoPaused(true)}
            onMouseLeave={() => setAgentsAutoPaused(false)}
            onTouchStart={() => setAgentsAutoPaused(true)}
            onTouchEnd={() => setAgentsAutoPaused(false)}
            onFocusCapture={() => setAgentsAutoPaused(true)}
            onBlurCapture={() => setAgentsAutoPaused(false)}
          >
            <div className="flex w-max gap-6">
              {agents.map((agent, idx) => (
                <article key={agent.name} className="w-[280px] shrink-0 snap-start overflow-hidden rounded-sm border border-black/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
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

      <footer className="bg-[#0F0F10] px-4 py-10 text-white sm:px-6 lg:px-28">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 text-center md:col-span-1 md:text-left">
            <h3 className="text-2xl font-bold sm:text-3xl">Jewellz Realty</h3>
            <p className="mt-2 max-w-sm text-center text-xs leading-5 text-white/70 sm:mt-3 sm:text-sm sm:leading-6">
              Your trusted real estate partner for buying, selling, and investing in premium but affordable properties.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 sm:mt-5">
              <span className="h-2 w-2 rounded-full bg-[#DE141C]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 sm:text-xs">Licensed Brokerage Team</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-white/90 sm:text-sm">Quick Links</h4>
            <ul className="mt-2 space-y-1.5 text-xs text-white/70 sm:mt-4 sm:space-y-2 sm:text-sm">
              <li><a href="/" className="transition-colors hover:text-[#DE141C]">Home</a></li>
              <li><a href="/project-list" className="transition-colors hover:text-[#DE141C]">Project List</a></li>
              <li><a href="/gallery" className="transition-colors hover:text-[#DE141C]">Gallery</a></li>
              <li><a href="/about-us" className="transition-colors hover:text-[#DE141C]">About Us</a></li>
              <li><a href="/contact" className="transition-colors hover:text-[#DE141C]">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-white/90 sm:text-sm">Contact</h4>
            <ul className="mt-2 space-y-1.5 text-xs text-white/70 sm:mt-4 sm:space-y-2 sm:text-sm">
              <li>Batangas, Philippines</li>
              <li>+63 917 123 4567</li>
              <li>inquiries@jewellzrealty.com</li>
              <li>Mon - Sat, 9:00 AM - 6:00 PM</li>
            </ul>
          </div>

          <div className="col-span-2 text-center md:col-span-1 md:text-left">
            <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-white/90 sm:text-sm">Follow Us</h4>
            <div className="mt-2 flex items-center justify-center gap-2 sm:mt-4 md:justify-start">
              <a href="#" className="grid h-8 w-8 place-items-center border border-white/20 text-[11px] text-white/85 transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white sm:h-9 sm:w-9">f</a>
              <a href="#" className="grid h-8 w-8 place-items-center border border-white/20 text-[11px] text-white/85 transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white sm:h-9 sm:w-9">ig</a>
              <a href="#" className="grid h-8 w-8 place-items-center border border-white/20 text-[11px] text-white/85 transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white sm:h-9 sm:w-9">in</a>
              <a href="#" className="grid h-8 w-8 place-items-center border border-white/20 text-[11px] text-white/85 transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white sm:h-9 sm:w-9">yt</a>
            </div>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-white/65 sm:mt-4 sm:text-sm md:mx-0">Stay updated with listings, open houses, and real estate tips.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/15 pt-4 text-center text-[11px] text-white/55 sm:mt-10 sm:gap-3 sm:pt-5 sm:text-xs md:flex-row md:items-center md:justify-between md:text-left">
          <p>Copyright Jewellz Realty 2026. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 md:justify-start">
            <a href="#" className="hover:text-[#DE141C]">Privacy Policy</a>
            <a href="#" className="hover:text-[#DE141C]">Terms & Conditions</a>
          </div>
        </div>
      </footer>
    </main>
  );
}


