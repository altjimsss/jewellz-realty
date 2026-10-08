"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

export type DateFilterState = {
	type: "all" | "single" | "range";
	date: string | null; // "YYYY-MM-DD"
	startDate?: string | null;
	endDate?: string | null;
	label: string;
};

type AdminCalendarWidgetProps = {
	selectedDate: string | null; // "YYYY-MM-DD" or null for All Time
	onSelectDate: (date: string | null, label?: string) => void;
	countsByDate?: Record<string, { inquiries: number; events: number; logs: number }>;
};

const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatIsoDate(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function parseIsoDate(iso: string): Date {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d);
}

export function AdminCalendarWidget({
	selectedDate,
	onSelectDate,
	countsByDate = {},
}: AdminCalendarWidgetProps) {
	const [isOpen, setIsOpen] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);

	// Today's date reference
	const today = useMemo(() => new Date(), []);
	const todayIso = useMemo(() => formatIsoDate(today), [today]);

	// Current view month & year in the calendar
	const [viewDate, setViewDate] = useState(() => {
		if (selectedDate) {
			const parsed = parseIsoDate(selectedDate);
			if (!Number.isNaN(parsed.getTime())) return parsed;
		}
		return new Date();
	});

	// Close on outside click
	useEffect(() => {
		if (!isOpen) return;

		function handleClickOutside(event: MouseEvent) {
			if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setIsOpen(false);
		}

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	// Navigate months
	function prevMonth() {
		setViewDate((cur) => new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
	}

	function nextMonth() {
		setViewDate((cur) => new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
	}

	function jumpToToday() {
		const now = new Date();
		setViewDate(now);
		onSelectDate(formatIsoDate(now), "Today");
	}

	// Generate matrix of days for the viewDate
	const calendarDays = useMemo(() => {
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();

		const firstDayOfMonth = new Date(year, month, 1);
		const lastDayOfMonth = new Date(year, month + 1, 0);

		const daysInMonth = lastDayOfMonth.getDate();
		const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday

		const prevMonthLastDay = new Date(year, month, 0).getDate();

		const days: Array<{
			date: Date;
			iso: string;
			dayNumber: number;
			isCurrentMonth: boolean;
			isToday: boolean;
			isSelected: boolean;
			hasActivity: boolean;
			activityCount: number;
		}> = [];

		// Previous month padding days
		for (let i = startDayOfWeek - 1; i >= 0; i--) {
			const d = new Date(year, month - 1, prevMonthLastDay - i);
			const iso = formatIsoDate(d);
			const counts = countsByDate[iso];
			const total = (counts?.inquiries ?? 0) + (counts?.events ?? 0) + (counts?.logs ?? 0);
			days.push({
				date: d,
				iso,
				dayNumber: prevMonthLastDay - i,
				isCurrentMonth: false,
				isToday: iso === todayIso,
				isSelected: iso === selectedDate,
				hasActivity: total > 0,
				activityCount: total,
			});
		}

		// Current month days
		for (let i = 1; i <= daysInMonth; i++) {
			const d = new Date(year, month, i);
			const iso = formatIsoDate(d);
			const counts = countsByDate[iso];
			const total = (counts?.inquiries ?? 0) + (counts?.events ?? 0) + (counts?.logs ?? 0);
			days.push({
				date: d,
				iso,
				dayNumber: i,
				isCurrentMonth: true,
				isToday: iso === todayIso,
				isSelected: iso === selectedDate,
				hasActivity: total > 0,
				activityCount: total,
			});
		}

		// Next month padding days to complete 35 or 42 grid cells
		const remaining = (7 - (days.length % 7)) % 7;
		for (let i = 1; i <= remaining; i++) {
			const d = new Date(year, month + 1, i);
			const iso = formatIsoDate(d);
			const counts = countsByDate[iso];
			const total = (counts?.inquiries ?? 0) + (counts?.events ?? 0) + (counts?.logs ?? 0);
			days.push({
				date: d,
				iso,
				dayNumber: i,
				isCurrentMonth: false,
				isToday: iso === todayIso,
				isSelected: iso === selectedDate,
				hasActivity: total > 0,
				activityCount: total,
			});
		}

		return days;
	}, [viewDate, selectedDate, todayIso, countsByDate]);

	// Human readable trigger label - displays current date today by default, or the selected filter date
	const triggerLabel = useMemo(() => {
		if (!selectedDate) {
			return today.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
		}
		if (selectedDate === todayIso) {
			return `Today · ${today.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
		}
		const parsed = parseIsoDate(selectedDate);
		return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
	}, [selectedDate, today, todayIso]);

	// Selected date statistics
	const selectedCounts = selectedDate ? countsByDate[selectedDate] : null;

	return (
		<div className="relative inline-block" ref={popoverRef}>
			{/* Trigger Button */}
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={() => setIsOpen((prev) => !prev)}
					aria-expanded={isOpen}
					aria-haspopup="dialog"
					className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition shadow-sm ${
						selectedDate
							? "border-[#DE141C]/30 bg-red-50/70 text-[#DE141C] hover:bg-red-100/60"
							: "border-black/10 bg-white text-black/75 hover:bg-zinc-50"
					}`}
					title={selectedDate ? `Filtered to ${selectedDate}. Click to change.` : "Click to filter workspace by date"}
				>
					<CalendarDays className={`h-3.5 w-3.5 ${selectedDate ? "text-[#DE141C]" : "text-black/50"}`} />
					<span className="font-semibold">{triggerLabel}</span>
					{selectedDate ? (
						<span className="ml-0.5 rounded-full bg-[#DE141C] px-1.5 py-0.2 text-[9px] font-bold text-white">
							Filtered
						</span>
					) : null}
				</button>

				{/* Quick clear button if a date is active */}
				{selectedDate ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onSelectDate(null);
						}}
						className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white text-black/45 transition hover:bg-zinc-100 hover:text-black"
						title="Clear date filter (Show All Time)"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				) : null}
			</div>

			{/* Dropdown Popover */}
			{isOpen && (
				<div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-black/10 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
					{/* Header: Presets */}
					<div className="flex flex-wrap items-center gap-1 border-b border-black/5 pb-3">
						<button
							type="button"
							onClick={() => {
								onSelectDate(null);
								setIsOpen(false);
							}}
							className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
								!selectedDate
									? "bg-[#111111] text-white"
									: "bg-zinc-100 text-black/60 hover:bg-zinc-200"
							}`}
						>
							All Time
						</button>
						<button
							type="button"
							onClick={() => {
								jumpToToday();
								setIsOpen(false);
							}}
							className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
								selectedDate === todayIso
									? "bg-[#DE141C] text-white"
									: "bg-zinc-100 text-black/60 hover:bg-zinc-200"
							}`}
						>
							Today
						</button>
						<button
							type="button"
							onClick={() => {
								const yesterday = new Date();
								yesterday.setDate(yesterday.getDate() - 1);
								const iso = formatIsoDate(yesterday);
								setViewDate(yesterday);
								onSelectDate(iso, "Yesterday");
								setIsOpen(false);
							}}
							className="rounded-md bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-black/60 transition hover:bg-zinc-200"
						>
							Yesterday
						</button>
					</div>

					{/* Month & Year Navigation */}
					<div className="mt-3 flex items-center justify-between px-1">
						<span className="text-sm font-bold text-[#111111]">
							{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
						</span>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={prevMonth}
								className="rounded-md border border-black/10 p-1 text-black/60 transition hover:bg-zinc-100 hover:text-black"
								aria-label="Previous month"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<button
								type="button"
								onClick={nextMonth}
								className="rounded-md border border-black/10 p-1 text-black/60 transition hover:bg-zinc-100 hover:text-black"
								aria-label="Next month"
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>

					{/* Weekday headers */}
					<div className="mt-3 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wider text-black/40">
						{WEEKDAY_NAMES.map((day) => (
							<div key={day} className="py-1">
								{day}
							</div>
						))}
					</div>

					{/* Day grid */}
					<div className="mt-1 grid grid-cols-7 gap-1">
						{calendarDays.map((item) => {
							const isSelected = item.isSelected;
							const isToday = item.isToday;

							return (
								<button
									key={item.iso}
									type="button"
									onClick={() => {
										onSelectDate(item.iso);
										setIsOpen(false);
									}}
									className={`relative flex h-8 w-full flex-col items-center justify-center rounded-lg text-xs font-medium transition ${
										isSelected
											? "bg-[#111111] font-bold text-white shadow-sm"
											: isToday
												? "border border-[#DE141C] font-bold text-[#DE141C] hover:bg-red-50"
												: item.isCurrentMonth
													? "text-black/85 hover:bg-zinc-100"
													: "text-black/25 hover:bg-zinc-50"
									}`}
									title={`${item.iso}${item.hasActivity ? ` (${item.activityCount} recorded items)` : ""}`}
								>
									<span>{item.dayNumber}</span>
									{/* Activity indicator dot */}
									{item.hasActivity && !isSelected && (
										<span
											className={`absolute bottom-1 h-1 w-1 rounded-full ${
												isToday ? "bg-[#DE141C]" : "bg-black/50"
											}`}
										/>
									)}
								</button>
							);
						})}
					</div>

					{/* Selected Date Summary & Clear Footer */}
					<div className="mt-4 border-t border-black/5 pt-3">
						{selectedDate ? (
							<div className="rounded-xl bg-zinc-50 p-2.5 text-xs">
								<div className="flex items-center justify-between">
									<span className="font-semibold text-[#111111]">
										{parseIsoDate(selectedDate).toLocaleDateString(undefined, {
											weekday: "short",
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</span>
									<button
										type="button"
										onClick={() => {
											onSelectDate(null);
											setIsOpen(false);
										}}
										className="text-[11px] font-semibold text-[#DE141C] hover:underline"
									>
										Clear Filter
									</button>
								</div>
								<div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-black/55">
									<span>
										<strong>{selectedCounts?.inquiries ?? 0}</strong> inquiries
									</span>
									<span>•</span>
									<span>
										<strong>{selectedCounts?.events ?? 0}</strong> events
									</span>
									<span>•</span>
									<span>
										<strong>{selectedCounts?.logs ?? 0}</strong> logs
									</span>
								</div>
							</div>
						) : (
							<div className="flex items-center justify-between text-[11px] text-black/50">
								<span>Showing all-time records</span>
								<button
									type="button"
									onClick={() => {
										jumpToToday();
										setIsOpen(false);
									}}
									className="font-semibold text-[#DE141C] hover:underline"
								>
									Filter to Today
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
