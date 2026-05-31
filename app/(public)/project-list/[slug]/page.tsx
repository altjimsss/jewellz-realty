import { notFound } from "next/navigation";
import { Poppins } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyBanner } from "@/components/layout/PropertyBanner";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyChatAssistant } from "@/components/properties/PropertyChatAssistant";
import { PropertyGallery } from "@/components/properties/PropertyGallery";
import { PropertyLocationMap } from "@/components/properties/PropertyLocationMap";
import { InquireCard } from "@/components/properties/InquireCard";
import { ParamIcon } from "@/components/properties/ParamIcon";
import { RouteScrollOffset } from "@/components/layout/RouteScrollOffset";

import { formatPHPWhole } from "@/lib/currency";
import { SAMPLE_PROPERTIES, getPropertyBySlug, getRelatedProperties } from "@/lib/sample-properties";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

type PageProps = {
  params: Promise<{ slug: string }>;
};

function StatIcon({ label }: { label: string }) {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("bed")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
        <path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (normalizedLabel.includes("bath")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
        <path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (normalizedLabel.includes("area") || normalizedLabel.includes("sqm") || normalizedLabel.includes("lot") || normalizedLabel.includes("land")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 8h8M8 12h5M8 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (normalizedLabel.includes("water")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
        <path d="M12 3s4 4.4 4 8.5A4 4 0 118 11.5C8 7.4 12 3 12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (normalizedLabel.includes("section")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
        <path d="M12 21s6-4.5 6-10a6 6 0 10-12 0c0 5.5 6 10 6 10z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function generateStaticParams() {
  return SAMPLE_PROPERTIES.map((property) => ({ slug: property.slug }));
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const relatedProperties = getRelatedProperties(property.slug, 3);
  const galleryImages =
    property.images?.length
      ? property.images
      : [property.image, ...relatedProperties.map((item) => item.image)]
          .filter((image): image is string => Boolean(image))
          .slice(0, 3);

  const statItems = property.specs?.length
    ? property.specs
    : [
        { label: "Bedrooms", value: String(property.beds ?? 0) },
        { label: "Bathrooms", value: String(property.baths ?? 0) },
        { label: "Area", value: `${property.areaSqm ?? 0} sqm` },
      ];

  const computedDescription =
    property.type === "Lot"
      ? "A spacious lot in a prime location, ideal for residential or investment use. Flexible for custom builds with good access to roads, utilities, and nearby community essentials."
      : property.type === "House"
        ? "Charleston Place by APEC Homes provides affordable, quality housing for Filipino families. Located near essential services, schools, and transport hubs — perfect for first-time homeowners."
        : property.type === "Condo"
          ? "A modern condo with a clean, functional layout and convenient access to nearby amenities. Designed for urban living — ideal for young professionals and small families seeking comfort."
          : "A well-presented property suited for buyers looking for value, space, and a great location. Offers a balance of comfort and practicality for everyday family living.";

  const parameterItems = [
  { label: "Floor Area", value: property.areaSqm ? `+/- ${property.areaSqm} sqm` : "N/A", icon: "area" },
  { label: "Lot Area", value: property.specs?.find((s) => /lot/i.test(s.label))?.value ?? "N/A", icon: "grid" },
  { label: "Levels", value: property.specs?.find((s) => /level/i.test(s.label))?.value ?? "2", icon: "levels" },
  { label: "Bedroom", value: String(property.beds ?? 0), icon: "bed" },
  { label: "Bathroom", value: String(property.baths ?? 0), icon: "bath" },
  { label: "Garage", value: property.specs?.find((s) => /garage/i.test(s.label))?.value ?? "0", icon: "garage" },
];

  return (
    <main className={`${poppins.className} bg-white text-[#181A20]`}>
      <div className="flex h-7 items-center justify-center gap-1 bg-black px-2 text-[10px] text-[#FAFAFA] sm:h-8 sm:gap-2 sm:text-sm">
        <p className="whitespace-nowrap">Premium but Affordable (deals) Properties on Sale.</p>
        <a className="underline" href="#">
          BrowseNow
        </a>
      </div>

      <Navbar links={navLinks} fontClassName={poppins.className} />
      <RouteScrollOffset offset={290} />
      <PropertyBanner />

      <section className="mx-auto max-w-[1200px] px-4 py-4 md:py-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6">
            <PropertyGallery images={galleryImages} title={property.title} />

            {/* Location */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-[#DE141C]">
                <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" aria-hidden="true">
                  <path d="M12 21s6-4.7 6-10a6 6 0 10-12 0c0 5.3 6 10 6 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="11" r="2.3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                <h2 className="text-xl font-semibold text-black">Location</h2>
              </div>
              <span className="text-black/30" aria-hidden="true">•</span>
              <span className="text-sm text-black/70">{property.location ?? "Location not specified"}</span>
              <span className="text-black/30" aria-hidden="true">•</span>
              <PropertyLocationMap property={property} />
            </div>

            {/* Recommendations */}
            <div className="mt-6">
              <div className="mb-4 flex items-center gap-2 text-[#DE141C]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                  <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M12 7v10M8 9l4-2 4 2M8 15l4 2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2 className="text-xl font-semibold text-black">Recommendations</h2>
              </div>
              <div className="-mx-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-3 px-1">
                  {relatedProperties.map((relatedProperty) => (
                    <div key={relatedProperty.id} className="w-[300px] shrink-0">
                      <PropertyCard
                        property={relatedProperty}
                        href={`/project-list/${relatedProperty.slug}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[12px] bg-white p-4 ">
              <div className="flex items-start justify-between gap-3">
  <div>
    <h1 className="text-2xl font-semibold leading-tight text-black">{property.title}</h1>
    <div className="mt-2 inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/60">
      {property.category ?? property.type ?? "Listing"}
    </div>
  </div>
  <a
    href="/project-list"
    className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-black/60 transition-colors hover:bg-black/5"
  >
    Back
  </a>
</div>

              <p className="mt-3 text-sm uppercase tracking-[0.12em] text-black/50">Start at</p>
              <p className="mt-1 text-[30px] font-semibold leading-none text-black">{formatPHPWhole(property.price)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-black/45">
                <span>PHP {Math.round(property.price / 12).toLocaleString()} / month</span>
                <span aria-hidden="true">|</span>
                <span>{property.type ?? "Property"}</span>
                <span aria-hidden="true">|</span>
                <span className="font-medium text-[#DE141C]">Available</span>
              </div>

              <p className="mt-4 text-sm leading-6 text-black/70">{computedDescription}</p>

              <hr className="my-4 border-black/10" />

              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
  {parameterItems.map(({ label, value, icon }) => (
    <div key={label} className="flex items-center gap-2 py-1">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#DE141C]/10">
        <ParamIcon type={icon} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-black/45">
          {label}
        </p>
        <p className="truncate text-xs font-semibold text-black">{value}</p>
      </div>
    </div>
  ))}
</div>
            </div>

            <PropertyChatAssistant property={property} />

            {/* ✅ Collapsible Inquire Card */}
            <InquireCard />

            <p className="text-right text-xs text-black/45">This property is brought to you by: APECHOMES</p>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}