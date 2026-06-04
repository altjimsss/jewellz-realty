"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type InquiryVolumeRow = {
	inquiry_date?: string;
	total_inquiries?: number;
};

export function InquiryVolumeChart({ rows = [] }: { rows?: InquiryVolumeRow[] }) {
	const chartRows = rows
		.slice()
		.reverse()
		.slice(-21)
		.map((row) => ({
			date: row.inquiry_date ?? "",
			inquiries: row.total_inquiries ?? 0,
		}));

	return (
		<div className="h-64 rounded-lg border border-black/10 bg-white p-4">
			{chartRows.length ? (
				<div className="h-full">
					<div className="mb-3">
						<div className="text-sm font-semibold text-[#111111]">Inquiry Volume</div>
						<p className="text-xs text-black/45">Daily lead submissions over the latest period.</p>
					</div>
					<div className="h-[calc(100%-40px)]">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={chartRows} margin={{ top: 8, right: 12, left: -18, bottom: 14 }}>
								<defs>
									<linearGradient id="inquiryVolumeFill" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#111111" stopOpacity={0.18} />
										<stop offset="95%" stopColor="#111111" stopOpacity={0.02} />
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} stroke="#ececec" />
								<XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<NeutralTooltip />} cursor={{ stroke: "#d4d4d8", strokeDasharray: "4 4" }} />
								<Area type="monotone" dataKey="inquiries" name="Inquiries" stroke="#111111" strokeWidth={2.5} fill="url(#inquiryVolumeFill)" activeDot={{ r: 5, fill: "#111111", stroke: "#ffffff", strokeWidth: 2 }} />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>
			) : <p className="text-sm text-black/45">No inquiry volume data yet.</p>}
		</div>
	);
}

function NeutralTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string }>; label?: string }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg">
			<div className="mb-1 font-semibold text-[#111111]">{label}</div>
			{payload.map((item) => (
				<div key={item.name} className="flex items-center justify-between gap-4 text-black/60">
					<span>{item.name}</span>
					<span className="font-medium text-[#111111]">{item.value}</span>
				</div>
			))}
		</div>
	);
}
