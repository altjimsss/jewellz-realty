import { PropertyCard } from "@/components/properties/PropertyCard";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { Property } from "@/types/property";

export type AiRecommendedProperty = {
	property: Property;
	reason: string;
	confidence?: number;
	recommendationId?: string;
	source: "ai" | "fallback";
};

type RecommendationPanelProps = {
	recommendations: AiRecommendedProperty[];
	status: "idle" | "loading" | "ready" | "fallback";
};

export function RecommendationPanel({ recommendations, status }: RecommendationPanelProps) {
	const { track } = useAnalytics();

	if (recommendations.length === 0) return null;

	return (
		<div className="mt-8">
			<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#DE141C]">AI Recommendations</p>
					<h3 className="mt-1 text-xl font-semibold text-black">Similar properties you might like</h3>
					<p className="mt-1 text-sm text-black/55">
						{status === "loading"
							? "AI is analyzing similar properties..."
							: status === "ready"
								? "Ranked by AI from your search intent, category, location, budget, and property details."
								: "Showing smart fallback matches while AI recommendations are unavailable."}
					</p>
				</div>
				<div className="inline-flex w-fit rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-[#DE141C]">
					AI found {recommendations.length} similar {recommendations.length === 1 ? "property" : "properties"} instead
				</div>
			</div>

			<div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
				{recommendations.map(({ property, reason, confidence, recommendationId, source }) => (
					<div
						key={property.id}
						className="space-y-2"
						onClick={() => track("recommendation_click", { propertyId: property.id, recommendationId, recommendationSource: source })}
					>
						<PropertyCard property={property} href={`/project-list/${property.slug}`} />
						<p className="rounded-full bg-zinc-50 px-3 py-2 text-xs font-medium text-black/55">
							{source === "ai" ? "AI reason" : "Recommended"}: {reason}
							{typeof confidence === "number" ? ` • ${Math.round(confidence)}% match` : ""}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
