import { notFound } from "next/navigation";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
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
import { getNearbyPlaceGroups } from "@/lib/nearby-places";
import { SAMPLE_PROPERTIES, getPropertyBySlug, getRelatedProperties } from "@/lib/sample-properties";
import { getPublishedProperties, getPublishedPropertyBySlug } from "@/lib/supabase/properties";

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

export function generateStaticParams() {
  return SAMPLE_PROPERTIES.map((property) => ({ slug: property.slug }));
}

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getPublishedPropertyBySlug(slug) ?? getPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const publishedProperties = await getPublishedProperties();
  const relatedProperties = publishedProperties.filter((item) => item.slug !== property.slug).slice(0, 3);
  const fallbackRelatedProperties = relatedProperties.length ? relatedProperties : getRelatedProperties(property.slug, 3);
  const galleryImages =
    property.images?.length
      ? property.images
      : [property.image, ...fallbackRelatedProperties.map((item) => item.image)]
          .filter((image): image is string => Boolean(image))
          .slice(0, 3);
  const [latitude, longitude] = property.coordinates ?? [];
  const nearbyGroups = await getNearbyPlaceGroups({ latitude, longitude, propertyType: property.type });

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
      <AnnouncementBar />

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
              <PropertyLocationMap property={property} nearbyGroups={nearbyGroups} />
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
                  {fallbackRelatedProperties.map((relatedProperty) => (
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
  <Link
    href="/project-list"
    className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-black/60 transition-colors hover:bg-black/5"
  >
    Back
  </Link>
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
