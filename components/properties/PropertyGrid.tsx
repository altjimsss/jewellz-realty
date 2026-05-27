"use client";

import type { Property } from "@/types/property";
import { PropertyCard } from "@/components/properties/PropertyCard";

type PropertyGridProps = {
	properties: Property[];
};

export function PropertyGrid({ properties }: PropertyGridProps) {
	return (
		<div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
			{properties.map((property) => (
				<PropertyCard key={property.id} property={property} />
			))}
		</div>
	);
}