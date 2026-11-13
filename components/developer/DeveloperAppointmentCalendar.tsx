"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";

export type DeveloperAppointment = {
	id: string;
	property_id: string | null;
	property_title: string;
	buyer_name: string;
	appointment_type: string;
	scheduled_at: string;
	location: string | null;
};

const MANILA = "Asia/Manila";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(value: Date | string) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: MANILA,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(value instanceof Date ? value : new Date(value));
	const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
	return `${part("year")}-${part("month")}-${part("day")}`;
}

function monthTitle(month: Date) {
	return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
}

function appointmentTime(value: string) {
	return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: MANILA }).format(new Date(value));
}

export function DeveloperAppointmentCalendar({ appointments }: { appointments: DeveloperAppointment[] }) {
	const todayKey = useMemo(() => dateKey(new Date()), []);
	const [year, month, day] = todayKey.split("-").map(Number);
	const [visibleMonth, setVisibleMonth] = useState(() => new Date(Date.UTC(year, month - 1, 1)));
	const [selectedDate, setSelectedDate] = useState(todayKey);
	const appointmentDays = useMemo(() => {
		const days = new Map<string, DeveloperAppointment[]>();
		appointments.forEach((appointment) => {
			const key = dateKey(appointment.scheduled_at);
			days.set(key, [...(days.get(key) ?? []), appointment]);
		});
		return days;
	}, [appointments]);
	const cells = useMemo(() => {
		const firstWeekday = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), 1)).getUTCDay();
		const leadingDays = (firstWeekday + 6) % 7;
		const daysInMonth = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 0)).getUTCDate();
		return Array.from({ length: 42 }, (_, index) => {
			const dayNumber = index - leadingDays + 1;
			if (dayNumber < 1 || dayNumber > daysInMonth) return null;
			return `${visibleMonth.getUTCFullYear()}-${String(visibleMonth.getUTCMonth() + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
		});
	}, [visibleMonth]);
	const selectedAppointments = appointmentDays.get(selectedDate) ?? [];
	const monthAppointmentCount = appointments.filter((item) => {
		const key = dateKey(item.scheduled_at);
		return key.startsWith(`${visibleMonth.getUTCFullYear()}-${String(visibleMonth.getUTCMonth() + 1).padStart(2, "0")}-`);
	}).length;

	function changeMonth(amount: number) {
		setVisibleMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + amount, 1)));
		setSelectedDate("");
	}

	return (
		<section className="border border-black/10 bg-white">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
				<div className="flex items-center gap-3">
					<span className="grid h-9 w-9 place-items-center bg-[#DE141C] text-white"><CalendarDays className="h-4 w-4" /></span>
					<div>
						<h2 className="text-sm font-semibold text-[#111111]">Confirmed appointments</h2>
						<p className="mt-0.5 text-xs text-black/50">Customer appointments for your properties</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="mr-1 text-xs text-black/50">{monthAppointmentCount} this month</span>
					<button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="grid h-8 w-8 place-items-center border border-black/10 text-black/70 hover:bg-zinc-50"><ChevronLeft className="h-4 w-4" /></button>
					<strong className="min-w-32 text-center text-sm font-semibold text-[#111111]">{monthTitle(visibleMonth)}</strong>
					<button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="grid h-8 w-8 place-items-center border border-black/10 text-black/70 hover:bg-zinc-50"><ChevronRight className="h-4 w-4" /></button>
				</div>
			</div>

			<div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
				<div className="p-3 sm:p-4">
					<div className="grid grid-cols-7 border-l border-t border-black/10">
						{WEEKDAYS.map((weekday) => <div key={weekday} className="border-b border-r border-black/10 bg-zinc-50 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-black/50">{weekday}</div>)}
						{cells.map((key, index) => {
							const dayNumber = key ? Number(key.slice(-2)) : null;
							const count = key ? appointmentDays.get(key)?.length ?? 0 : 0;
							const isSelected = key === selectedDate;
							return (
								<button key={key ?? `empty-${index}`} type="button" disabled={!key} onClick={() => key && setSelectedDate(key)} className={`flex min-h-[58px] flex-col items-start border-b border-r border-black/10 p-1.5 text-left transition sm:min-h-[72px] sm:p-2 ${!key ? "bg-zinc-50/50" : "hover:bg-red-50/60"} ${isSelected ? "bg-red-50 ring-1 ring-inset ring-[#DE141C]" : "bg-white"}`}>
									{dayNumber ? <span className={`text-xs ${key === todayKey ? "grid h-6 w-6 place-items-center bg-[#111111] font-semibold text-white" : "font-medium text-black/75"}`}>{dayNumber}</span> : null}
									{count > 0 ? <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#B5121B]"><span className="h-1.5 w-1.5 bg-[#DE141C]" />{count} <span className="hidden sm:inline">{count === 1 ? "appointment" : "appointments"}</span></span> : null}
								</button>
							);
						})}
					</div>
				</div>

				<aside className="border-t border-black/10 p-4 lg:border-l lg:border-t-0">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-sm font-semibold text-[#111111]">{selectedDate ? new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${selectedDate}T00:00:00Z`)) : "Select a day"}</h3>
						{selectedDate === todayKey ? <span className="bg-zinc-100 px-2 py-1 text-[10px] font-medium text-black/60">Today</span> : null}
					</div>
					{selectedAppointments.length ? (
						<div className="space-y-2">
							{selectedAppointments.map((appointment) => (
								<article key={appointment.id} className="border border-black/10 p-3">
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold text-[#111111]">{appointment.buyer_name}</p>
											<p className="mt-0.5 truncate text-xs text-black/55">{appointment.property_title}</p>
										</div>
										<span className="shrink-0 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Confirmed</span>
									</div>
									<div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-black/60">
										<span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{appointmentTime(appointment.scheduled_at)}</span>
										<span>{appointment.appointment_type.replaceAll("_", " ")}</span>
									</div>
									{appointment.location ? <p className="mt-2 flex items-start gap-1 text-[11px] text-black/55"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{appointment.location}</p> : null}
								</article>
							))}
						</div>
					) : (
						<div className="border border-dashed border-black/10 px-3 py-8 text-center">
							<CalendarDays className="mx-auto h-5 w-5 text-black/30" />
							<p className="mt-2 text-xs font-medium text-black/60">No confirmed appointments</p>
							<p className="mt-1 text-[11px] text-black/40">Select a date with an appointment count to see details.</p>
						</div>
					)}
				</aside>
			</div>
		</section>
	);
}
