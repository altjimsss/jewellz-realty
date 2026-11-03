import { ProjectListCard } from "@/components/properties/ProjectListCard";
import type { Property } from "@/types/property";

type PropertyCardProps = {
	property: Property;
	priceLabel?: string;
	href?: string;
	aiReason?: string;
	aiConfidence?: number;
};

export function PropertyCard({ property, priceLabel, href, aiReason, aiConfidence }: PropertyCardProps) {
	return <ProjectListCard property={property} priceLabel={priceLabel} href={href} aiReason={aiReason} aiConfidence={aiConfidence} />;
}
