"use client";

import type { Property } from "@/types/property";
import { PropertyCard } from "@/components/properties/PropertyCard";

type PropertyGridProps = {
	properties: Property[];
	className?: string;
};

export function PropertyGrid({ properties, className }: PropertyGridProps) {
	return (
		<div className={className ?? "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3"}>
			{properties.map((property) => (
				<PropertyCard key={property.id} property={property} href={`/project-list/${property.slug}`} />
			))}
		</div>
	);
}