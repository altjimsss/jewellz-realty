"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export type RecommendationRow = {
	id: string;
	property_id: string | null;
	was_clicked: boolean | null;
	is_fallback: boolean | null;
	clicked_at: string | null;
	generated_at: string | null;
};

export function useRecommendations() {
	const [data, setData] = useState<RecommendationRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		async function load() {
			const result = await supabaseBrowser
				.from("recommendations")
				.select("id, property_id, was_clicked, is_fallback, clicked_at, generated_at")
				.order("generated_at", { ascending: false });

			if (!active) return;
			setData((result.data ?? []) as RecommendationRow[]);
			setError(result.error?.message ?? null);
			setIsLoading(false);
		}

		void load();
		return () => {
			active = false;
		};
	}, []);

	return { data, isLoading, error };
}
