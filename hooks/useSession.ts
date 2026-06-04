"use client";

import { useEffect, useState } from "react";
import { getOrCreateSessionId } from "@/lib/session";

export function useSession() {
	const [sessionId, setSessionId] = useState("");

	useEffect(() => {
		setSessionId(getOrCreateSessionId());
	}, []);

	return { sessionId };
}
