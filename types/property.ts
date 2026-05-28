export type PropertyCategory =
	| "Featured"
	| "For Sale"
	| "For Rent"
	| "Pre-selling"
	| "Commercial"
	| string;

export type PropertyType =
	| "House"
	| "Apartment"
	| "Condo"
	| "Townhouse"
	| "Lot"
	| "Commercial"
	| string;

export type Property = {
	id: string;
	slug: string;
	title: string;
	price: number;

	location?: string;
	coordinates?: [number, number];
	image?: string;
	beds?: number;
	baths?: number;
	areaSqm?: number;
	type?: PropertyType;
	category?: PropertyCategory;
	featured?: boolean;
};