import type { ReactNode } from "react";

export default function CustomerLayout({ children }: { children: ReactNode }) {
	return <div className="customer-site min-h-screen">{children}</div>;
}
