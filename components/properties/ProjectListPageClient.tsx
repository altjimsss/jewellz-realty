"use client";

import { useEffect, useMemo, useState } from "react";
import { Poppins } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyBanner } from "@/components/layout/PropertyBanner";
import { RecommendationPanel, type AiRecommendedProperty } from "@/components/ai/RecommendationPanel";
import { extractBasicSearchIntent } from "@/lib/ai/search-intent";
import { PropertyFilters, type PropertyFiltersState } from "@/components/properties/PropertyFilters";
import { PropertyGrid } from "@/components/properties/PropertyGrid";
import { PropertyMapPreview } from "@/components/properties/PropertyMapPreview";
import { PropertyCard } from "@/components/properties/PropertyCard";
import type { Property } from "@/types/property";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

const CATEGORY_TABS = ["All", "Condo", "House", "Lot", "Farm", "Memorial"] as const;
const SEARCH_STOP_WORDS = new Set([
	"a",
	"an",
	"and",
	"are",
	"cheap",
	"affordable",
	"budget",
	"find",
	"for",
	"in",
	"looking",
	"low",
	"me",
	"near",
	"nearby",
	"need",
	"of",
	"place",
	"property",
	"show",
	"small",
	"the",
	"to",
	"want",
]);

function normalizeText(value: unknown) {
	return String(value ?? "").trim().toLowerCase();
}

function tokenize(value: string) {
	return normalizeText(value)
		.split(/[\s,.-]+/)
		.map((token) => token.trim())
		.filter((token) => token.length > 2);
}

function inferCategoryFromSearch(value: string) {
	return extractBasicSearchIntent(value).preferredTypes[0];
}

function keywordTokensForFiltering(keyword: string) {
	const inferredCategory = inferCategoryFromSearch(keyword);
	const categoryWords = new Set(
		inferredCategory === "Condo" ? ["condo", "condos", "condominium", "condominiums", "studio", "studios"] :
		inferredCategory === "House" ? ["house", "houses", "home", "homes", "family", "families", "residential"] :
		inferredCategory === "Memorial" ? ["memorial", "memorials", "lawn", "lawns", "cemetery", "grave"] :
		inferredCategory === "Farm" ? ["farm", "farms", "agricultural", "crop"] :
		inferredCategory === "Lot" ? ["lot", "lots", "land", "parcel"] :
		[],
	);

	return tokenize(keyword).filter((token) => !SEARCH_STOP_WORDS.has(token) && !categoryWords.has(token));
}

function inferSearchIntent(filters: PropertyFiltersState) {
	return extractBasicSearchIntent([
		filters.keyword,
		filters.lookingFor,
		filters.location,
		filters.subLocation,
	].join(" "));
}

function comparePropertiesByIntent(first: Property, second: Property, filters: PropertyFiltersState) {
	const intent = inferSearchIntent(filters);

	if (intent.familySuitable) {
		const firstBeds = first.beds ?? 0;
		const secondBeds = second.beds ?? 0;
		const firstFamilyReady = firstBeds >= 2 ? 1 : 0;
		const secondFamilyReady = secondBeds >= 2 ? 1 : 0;

		if (firstFamilyReady !== secondFamilyReady) return secondFamilyReady - firstFamilyReady;
	}

	if (intent.budgetIntent === "affordable") {
		return first.price - second.price;
	}

	if (intent.budgetIntent === "luxury") {
		return second.price - first.price;
	}

	return 0;
}

function getFilteredProperties(properties: Property[], activeCategory: (typeof CATEGORY_TABS)[number], filters: PropertyFiltersState) {
	const lookingFor = filters.lookingFor.trim().toLowerCase();
	const location = filters.location.trim().toLowerCase();
	const subLocation = filters.subLocation.trim().toLowerCase();
	const inferredCategory = inferCategoryFromSearch(`${filters.keyword} ${filters.lookingFor}`);
	const keywordTokens = keywordTokensForFiltering(filters.keyword);
	const priceMin = filters.priceMin === "" ? undefined : Number(filters.priceMin);
	const priceMax = filters.priceMax === "" ? undefined : Number(filters.priceMax);

	return properties.filter((property) => {
		const matchesTab = activeCategory === "All" ? true : (property.type ?? "") === activeCategory;
		const searchableText = normalizeText([
			property.title,
			property.type,
			property.category,
			property.location,
			property.description,
			...(property.specs ?? []).map((spec) => `${spec.label} ${spec.value}`),
		].join(" "));

		if (!matchesTab) return false;
		if (inferredCategory && normalizeText(property.type) !== normalizeText(inferredCategory)) return false;
		if (keywordTokens.length > 0 && !keywordTokens.some((token) => searchableText.includes(token))) return false;
		if (lookingFor && !(property.type ?? "").toLowerCase().includes(lookingFor)) return false;
		if (location && !(property.location ?? "").toLowerCase().includes(location)) return false;
		if (subLocation && !(property.location ?? "").toLowerCase().includes(subLocation)) return false;
		if (Number.isFinite(priceMin) && property.price < (priceMin as number)) return false;
		if (Number.isFinite(priceMax) && property.price > (priceMax as number)) return false;
		return true;
	}).sort((first, second) => comparePropertiesByIntent(first, second, filters));
}

function getRecommendationReason(property: Property, activeCategory: (typeof CATEGORY_TABS)[number], filters: PropertyFiltersState) {
	const reasons: string[] = [];
	const type = normalizeText(property.type);
	const location = normalizeText(property.location);
	const lookingFor = normalizeText(filters.lookingFor);
	const searchedLocation = normalizeText(filters.location || filters.subLocation);

	if (activeCategory !== "All" && type === normalizeText(activeCategory)) {
		reasons.push(`same ${activeCategory.toLowerCase()} category`);
	}

	if (lookingFor && type.includes(lookingFor)) {
		reasons.push(`matches "${filters.lookingFor}"`);
	}

	if (searchedLocation && location.includes(searchedLocation)) {
		reasons.push(`near ${filters.location || filters.subLocation}`);
	}

	if (filters.priceMin || filters.priceMax) {
		reasons.push("close to your budget");
	}

	return reasons.slice(0, 2).join(" • ") || "closest match to your search";
}

function getFallbackRecommendedProperties(properties: Property[], activeCategory: (typeof CATEGORY_TABS)[number], filters: PropertyFiltersState): AiRecommendedProperty[] {
	const keywordTokens = tokenize(filters.keyword);
	const locationTokens = tokenize(`${filters.location} ${filters.subLocation}`);
	const lookingForTokens = tokenize(filters.lookingFor);
	const priceMin = filters.priceMin === "" ? undefined : Number(filters.priceMin);
	const priceMax = filters.priceMax === "" ? undefined : Number(filters.priceMax);
	const hasBudget = Number.isFinite(priceMin) || Number.isFinite(priceMax);
	const targetPrice =
		Number.isFinite(priceMin) && Number.isFinite(priceMax)
			? ((priceMin as number) + (priceMax as number)) / 2
			: Number.isFinite(priceMin)
				? (priceMin as number)
				: Number.isFinite(priceMax)
					? (priceMax as number)
					: undefined;

	return properties
		.map((property) => {
			const haystack = normalizeText([
				property.title,
				property.type,
				property.category,
				property.location,
				property.description,
				...(property.specs ?? []).map((spec) => `${spec.label} ${spec.value}`),
			].join(" "));
			let score = 0;

			if (activeCategory !== "All" && normalizeText(property.type) === normalizeText(activeCategory)) score += 45;
			if (activeCategory !== "All" && normalizeText(property.type).includes(normalizeText(activeCategory))) score += 25;

			for (const token of lookingForTokens) {
				if (haystack.includes(token)) score += 20;
			}

			for (const token of keywordTokens) {
				if (haystack.includes(token)) score += 14;
			}

			for (const token of locationTokens) {
				if (normalizeText(property.location).includes(token)) score += 18;
			}

			if (hasBudget && targetPrice != null && property.price > 0) {
				const priceDelta = Math.abs(property.price - targetPrice) / Math.max(targetPrice, property.price);
				score += Math.max(0, 30 - Math.round(priceDelta * 40));
			}

			if (property.featured) score += 5;

			return {
				property,
				score,
				reason: getRecommendationReason(property, activeCategory, filters),
				source: "fallback" as const,
			};
		})
		.filter((item) => item.score > 0)
		.sort((first, second) => second.score - first.score || first.property.price - second.property.price)
		.slice(0, 6);
}

type ProjectListPageClientProps = {
	properties: Property[];
	initialSearch?: string;
};

export function ProjectListPageClient({ properties, initialSearch = "" }: ProjectListPageClientProps) {
	const normalizedInitialSearch = initialSearch.trim();
	const [activeCategory, setActiveCategory] = useState<(typeof CATEGORY_TABS)[number]>("All");
	const [draftFilters, setDraftFilters] = useState<PropertyFiltersState>({
		keyword: normalizedInitialSearch,
		lookingFor: "",
		location: "",
		subLocation: "",
		priceMin: "",
		priceMax: "",
		status: "",
	});
	const [appliedFilters, setAppliedFilters] = useState<PropertyFiltersState>({
		keyword: normalizedInitialSearch,
		lookingFor: "",
		location: "",
		subLocation: "",
		priceMin: "",
		priceMax: "",
		status: "",
	});
	const [hasSearched, setHasSearched] = useState(Boolean(normalizedInitialSearch));
	const filteredProperties = useMemo(() => getFilteredProperties(properties, activeCategory, appliedFilters), [activeCategory, appliedFilters, properties]);
	const fallbackRecommendedProperties = useMemo(
		() => (filteredProperties.length === 0 ? getFallbackRecommendedProperties(properties, activeCategory, appliedFilters) : []),
		[activeCategory, appliedFilters, filteredProperties.length, properties],
	);
	const [aiRecommendedProperties, setAiRecommendedProperties] = useState<AiRecommendedProperty[]>([]);
	const [aiRecommendationStatus, setAiRecommendationStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
	const recommendedProperties = hasSearched ? (aiRecommendedProperties.length > 0 ? aiRecommendedProperties : fallbackRecommendedProperties) : [];
	const submittedLocation = appliedFilters.location.trim().toLowerCase();
	const hasMatchingLocation = submittedLocation !== "" && filteredProperties.some((property) => Boolean(property.coordinates) && (property.location ?? "").toLowerCase().includes(submittedLocation));
	const primaryProperty = filteredProperties[0] ?? null;
	const showMapPreview = hasSearched && hasMatchingLocation && Boolean(primaryProperty);
	const leadProperties = showMapPreview ? filteredProperties.slice(0, 4) : filteredProperties;
	const remainingProperties = showMapPreview ? filteredProperties.slice(4) : [];

	useEffect(() => {
		if (!hasSearched || filteredProperties.length > 0 || properties.length === 0) {
			return;
		}

		const controller = new AbortController();
		const propertyById = new Map(properties.map((property) => [property.id, property]));

		async function loadAiRecommendations() {
			setAiRecommendationStatus("loading");
			setAiRecommendedProperties([]);

			try {
				const response = await fetch("/api/recommendations", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						category: activeCategory,
						filters: appliedFilters,
						properties,
					}),
					signal: controller.signal,
				});

				if (!response.ok) throw new Error("AI recommendation request failed.");

				const data: unknown = await response.json();
				const recommendations = Array.isArray((data as { recommendations?: unknown }).recommendations)
					? (data as { recommendations: Array<{ id?: unknown; reason?: unknown; confidence?: unknown }> }).recommendations
					: [];
				const mappedRecommendations = recommendations
					.flatMap((item): AiRecommendedProperty[] => {
						const id = typeof item.id === "string" ? item.id : "";
						const property = propertyById.get(id);
						if (!property) return [];

						return [{
							property,
							reason: typeof item.reason === "string" && item.reason.trim() ? item.reason.trim() : getRecommendationReason(property, activeCategory, appliedFilters),
							confidence: typeof item.confidence === "number" ? item.confidence : undefined,
							source: "ai" as const,
						}];
					})
					.slice(0, 6);

				setAiRecommendedProperties(mappedRecommendations);
				setAiRecommendationStatus(mappedRecommendations.length > 0 ? "ready" : "fallback");
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") return;
				setAiRecommendedProperties([]);
				setAiRecommendationStatus("fallback");
			}
		}

		void loadAiRecommendations();

		return () => controller.abort();
	}, [activeCategory, appliedFilters, filteredProperties.length, hasSearched, properties]);

	return (
		<main className={`${poppins.className} bg-white text-[#181A20]`}>
			<AnnouncementBar />

			<Navbar links={navLinks} fontClassName={poppins.className} />

			<PropertyBanner />

			<section className="mx-auto mt-6 max-w-[1200px] px-4">
				<PropertyFilters
					value={draftFilters}
					onChange={setDraftFilters}
					onSubmit={() => {
						setAppliedFilters(draftFilters);
						setHasSearched(true);
					}}
				/>
			</section>

			<section className="mx-auto max-w-[1200px] px-4 py-10">
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<h2 className="text-2xl font-semibold">Properties</h2>
						<p className="mt-1 text-sm text-black/60">Showing {filteredProperties.length} results</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{CATEGORY_TABS.map((tab) => {
							const active = tab === activeCategory;
							return (
								<button
									key={tab}
									type="button"
									onClick={() => setActiveCategory(tab)}
									className={`h-9 rounded-sm border px-3 text-xs font-semibold transition-colors ${
										active
											? "border-[#DE141C] bg-[#DE141C] text-white"
											: "border-black/10 bg-white text-black hover:bg-black/5"
									}`}
								>
									{tab}
								</button>
							);
						})}
					</div>
				</div>

				{filteredProperties.length > 0 ? (
					showMapPreview && primaryProperty ? (
						<div className="mt-7">
							<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
								<aside className="order-last overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-sm md:col-span-2 lg:order-none lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
									<div className="border-b border-black/10 p-4">
										<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/50">Map Preview</p>
										<h3 className="mt-1 text-[18px] font-semibold leading-tight text-black">Results</h3>
										<p className="mt-1 text-sm text-black/55">{filteredProperties.length} matched properties</p>
									</div>
									<PropertyMapPreview properties={filteredProperties} mapHeightClassName="h-[320px]" />
								</aside>

								{leadProperties.map((property) => (
									<PropertyCard key={property.id} property={property} href={`/project-list/${property.slug}`} />
								))}
							</div>

							{remainingProperties.length > 0 ? (
								<div className="mt-5">
									<PropertyGrid properties={remainingProperties} />
								</div>
							) : null}
						</div>
					) : (
						<div className="mt-7">
							<PropertyGrid properties={filteredProperties} />
						</div>
					)
				) : (
					<div className="mt-7">
						<p className="text-center text-sm text-black/55">No properties matched your search. Try a different keyword, location, or category.</p>

						{recommendedProperties.length > 0 ? (
							<RecommendationPanel recommendations={recommendedProperties} status={aiRecommendationStatus} />
						) : null}
					</div>
				)}
			</section>

			<Footer />
		</main>
	);
}
