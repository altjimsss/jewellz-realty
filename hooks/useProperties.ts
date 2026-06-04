"use client";

import { useEffect, useState } from "react";
import type { Property } from "@/types/property";

export function useProperties() {
	const [data, setData] = useState<Property[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		async function load() {
			try {
				const response = await fetch("/api/properties");
				const payload: unknown = await response.json();
				const rows = Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: Property[] }).data : [];
				if (active) setData(rows);
			} catch (caught) {
				if (active) setError(caught instanceof Error ? caught.message : "Unable to load properties.");
			} finally {
				if (active) setIsLoading(false);
			}
		}

		void load();
		return () => {
			active = false;
		};
	}, []);

	return { data, isLoading, error };
}
