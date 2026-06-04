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
	| "Farm"
	| "Memorial"
	| "Commercial"
	| string;

export type PropertySpec = {
	label: string;
	value: string;
};

export type Property = {
	id: string;
	slug: string;
	title: string;
	price: number;

	/** Optional full description text */
	description?: string;

	location?: string;
	coordinates?: [number, number];
	image?: string;
	images?: string[];
	beds?: number;
	baths?: number;
	areaSqm?: number;
	specs?: PropertySpec[];
	type?: PropertyType;
	category?: PropertyCategory;
	featured?: boolean;
	amenities?: string[];
	keyFeatures?: string[];
	videoUrl?: string;
	pricePerSqm?: number;
	monthlyAmortization?: number;
	isPriceNegotiable?: boolean;
	developerName?: string;
};
