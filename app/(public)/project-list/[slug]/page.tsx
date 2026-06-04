import { notFound } from "next/navigation";
import { Poppins } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyBanner } from "@/components/layout/PropertyBanner";
import { PropertyDetailContent } from "@/components/properties/PropertyDetailContent";
import { RouteScrollOffset } from "@/components/layout/RouteScrollOffset";

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

  return (
    <main className={`${poppins.className} bg-white text-[#181A20]`}>
      <AnnouncementBar />

      <Navbar links={navLinks} fontClassName={poppins.className} />
      <RouteScrollOffset offset={290} />
      <PropertyBanner />

      <PropertyDetailContent
        property={property}
        galleryImages={galleryImages}
        nearbyGroups={nearbyGroups}
        relatedProperties={fallbackRelatedProperties}
      />

      <Footer />
    </main>
  );
}
