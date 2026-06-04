"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export type InquiryRow = {
	id: string;
	property_id: string | null;
	buyer_name: string | null;
	buyer_email: string | null;
	status: string | null;
	priority: string | null;
	lead_score: number | null;
	created_at: string | null;
};

export function useInquiries() {
	const [data, setData] = useState<InquiryRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		async function load() {
			const result = await supabaseBrowser
				.from("inquiries")
				.select("id, property_id, buyer_name, buyer_email, status, priority, lead_score, created_at")
				.order("created_at", { ascending: false });

			if (!active) return;
			setData((result.data ?? []) as InquiryRow[]);
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
