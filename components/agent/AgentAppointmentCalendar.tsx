"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin, Plus, ShieldCheck, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export type AgentAppointment = {
  id: string;
  inquiry_id: string | null;
  property_id: string | null;
  property_title: string;
  buyer_name: string;
  appointment_type: string;
  scheduled_at: string;
  status: "requested" | "confirmed";
  location: string | null;
};

export type AgentAppointmentLead = {
  id: string;
  buyer_name?: string | null;
  buyer_email?: string | null;
  property_id?: string | null;
  properties?: { title?: string | null } | { title?: string | null }[] | null;
};

const TZ = "Asia/Manila";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value instanceof Date ? value : new Date(value));
  const part = (name: string) => parts.find((entry) => entry.type === name)?.value ?? "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

function formatDate(key: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(new Date(key + "T00:00:00Z"));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: TZ }).format(new Date(value));
}

export function AgentAppointmentCalendar({ appointments, assignedInquiries, onAppointmentsChange }: { appointments: AgentAppointment[]; assignedInquiries: AgentAppointmentLead[]; onAppointmentsChange: (items: AgentAppointment[]) => void }) {
  const today = useMemo(() => dateKey(new Date()), []);
  const [year, month] = today.split("-").map(Number);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(Date.UTC(year, month - 1, 1)));
  const [selectedDate, setSelectedDate] = useState(today);
  const [confirming, setConfirming] = useState<AgentAppointment | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [newDateTime, setNewDateTime] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newReady, setNewReady] = useState(false);
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState("");
  const byDate = useMemo(() => {
    const map = new Map<string, AgentAppointment[]>();
    appointments.forEach((item) => {
      const key = dateKey(item.scheduled_at);
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return map;
  }, [appointments]);
  const cells = useMemo(() => {
    const firstDay = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), 1)).getUTCDay();
    const offset = (firstDay + 6) % 7;
    const count = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 0)).getUTCDate();
    return Array.from({ length: 42 }, (_, i) => {
      const day = i - offset + 1;
      if (day < 1 || day > count) return null;
      return visibleMonth.getUTCFullYear() + "-" + String(visibleMonth.getUTCMonth() + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    });
  }, [visibleMonth]);
  const dayAppointments = byDate.get(selectedDate) ?? [];
  const pending = appointments.filter((item) => item.status === "requested").length;
  const prefix = visibleMonth.getUTCFullYear() + "-" + String(visibleMonth.getUTCMonth() + 1).padStart(2, "0") + "-";
  const monthCount = appointments.filter((item) => dateKey(item.scheduled_at).startsWith(prefix)).length;

  function moveMonth(amount: number) {
    setVisibleMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + amount, 1)));
    setSelectedDate("");
  }

  async function confirmAppointment() {
    if (!confirming || !ready || saving) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const response = await fetch("/api/agent/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: "Bearer " + data.session.access_token } : {}) },
        body: JSON.stringify({ appointmentId: confirming.id }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; appointment?: AgentAppointment };
      if (!response.ok || !result.appointment) throw new Error(result.error ?? "Could not confirm the appointment.");
      onAppointmentsChange(appointments.map((item) => item.id === confirming.id ? { ...item, ...result.appointment } : item));
      setConfirming(null);
      setReady(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not confirm the appointment.");
    } finally {
      setSaving(false);
    }
  }

  function openAddAppointment() {
    const suggested = new Date(Date.now() + 60 * 60 * 1000);
    suggested.setMinutes(Math.ceil(suggested.getMinutes() / 30) * 30, 0, 0);
    const localValue = new Date(suggested.getTime() - suggested.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    setLeadId(assignedInquiries[0]?.id ?? "");
    setNewDateTime(localValue);
    setNewLocation("");
    setNewNotes("");
    setNewReady(false);
    setNewError("");
    setAddOpen(true);
  }

  async function createAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadId || !newDateTime || !newLocation.trim() || !newReady || newSaving) return;
    setNewSaving(true);
    setNewError("");
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const response = await fetch("/api/agent/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: "Bearer " + data.session.access_token } : {}) },
        body: JSON.stringify({ inquiryId: leadId, scheduledAt: new Date(newDateTime).toISOString(), location: newLocation.trim(), notes: newNotes.trim() }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; appointment?: AgentAppointment };
      if (!response.ok || !result.appointment) throw new Error(result.error ?? "Could not save the appointment.");
      onAppointmentsChange([...appointments, result.appointment].sort((left, right) => left.scheduled_at.localeCompare(right.scheduled_at)));
      setSelectedDate(dateKey(result.appointment.scheduled_at));
      setVisibleMonth((current) => {
        const appointmentDate = new Date(result.appointment!.scheduled_at);
        const key = dateKey(appointmentDate);
        const [appointmentYear, appointmentMonth] = key.split("-").map(Number);
        return new Date(Date.UTC(appointmentYear, appointmentMonth - 1, 1));
      });
      setAddOpen(false);
    } catch (caught) {
      setNewError(caught instanceof Error ? caught.message : "Could not save the appointment.");
    } finally {
      setNewSaving(false);
    }
  }

  return (
    <>
      <section className="border border-black/10 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center bg-[#DE141C] text-white"><CalendarDays className="h-4 w-4" /></span>
            <div><h2 className="text-sm font-semibold">Customer appointments</h2><p className="mt-0.5 text-xs text-black/50">Review requests and track confirmed meetings</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openAddAppointment} disabled={!assignedInquiries.length} className="inline-flex h-8 items-center gap-1.5 bg-[#111111] px-3 text-xs font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add appointment</button>
            <span className={pending ? "bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800" : "bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"}>{pending ? pending + " need review" : "All reviewed"}</span>
            <span className="text-xs text-black/45">{monthCount} this month</span>
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="grid h-8 w-8 place-items-center border border-black/10 hover:bg-zinc-50"><ChevronLeft className="h-4 w-4" /></button>
            <strong className="min-w-32 text-center text-sm font-semibold">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(visibleMonth)}</strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="grid h-8 w-8 place-items-center border border-black/10 hover:bg-zinc-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </header>
        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(270px,0.75fr)]">
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-7 border-l border-t border-black/10">
              {WEEKDAYS.map((name) => <div key={name} className="border-b border-r border-black/10 bg-zinc-50 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-black/50">{name}</div>)}
              {cells.map((key, index) => {
                const total = key ? byDate.get(key)?.length ?? 0 : 0;
                const active = key === selectedDate;
                const cellClass = "flex min-h-[60px] flex-col items-start border-b border-r border-black/10 p-1.5 text-left transition sm:min-h-[72px] sm:p-2 " + (!key ? "bg-zinc-50/50 " : "hover:bg-red-50/60 ") + (active ? "bg-red-50 ring-1 ring-inset ring-[#DE141C]" : "bg-white");
                return <button key={key ?? "empty-" + index} type="button" disabled={!key} onClick={() => key && setSelectedDate(key)} className={cellClass}>
                  {key ? <span className={key === today ? "grid h-6 w-6 place-items-center bg-[#111111] text-xs font-semibold text-white" : "text-xs font-medium text-black/75"}>{Number(key.slice(-2))}</span> : null}
                  {total ? <span className="mt-1 inline-flex max-w-full items-center gap-1.5 border border-[#DE141C]/20 bg-red-50 px-1 py-0.5 text-[10px] font-semibold leading-none text-[#B5121B] sm:px-1.5 sm:py-1">
                    <span className="relative grid h-5 w-5 shrink-0 place-items-center bg-[#DE141C] text-white"><CalendarCheck2 className="h-3 w-3" /><span className="absolute -right-1 -top-1 grid h-3 w-3 place-items-center rounded-full bg-[#111111] text-[8px] font-bold leading-none text-white">{total > 9 ? "9+" : total}</span></span>
                    <span className="hidden truncate sm:inline">{total === 1 ? "Appointment" : `${total} appointments`}</span>
                  </span> : null}
                </button>;
              })}
            </div>
          </div>
          <aside className="border-t border-black/10 p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">{selectedDate ? formatDate(selectedDate, { weekday: "long", month: "long", day: "numeric" }) : "Select a day"}</h3>{selectedDate === today ? <span className="bg-zinc-100 px-2 py-1 text-[10px] font-medium text-black/60">Today</span> : null}</div>
            {dayAppointments.length ? <div className="space-y-2">{dayAppointments.map((item) => <article key={item.id} className="border border-black/10 p-3">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.buyer_name}</p><p className="mt-0.5 truncate text-xs text-black/55">{item.property_title}</p></div><span className={item.status === "confirmed" ? "shrink-0 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700" : "shrink-0 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800"}>{item.status === "confirmed" ? "Confirmed" : "Needs review"}</span></div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-black/60"><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(item.scheduled_at)}</span><span>{item.appointment_type.replaceAll("_", " ")}</span></div>
              {item.location ? <p className="mt-2 flex items-start gap-1 text-[11px] text-black/55"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{item.location}</p> : null}
              {item.status === "requested" ? <button type="button" onClick={() => { setConfirming(item); setReady(false); setError(""); }} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 bg-[#111111] px-3 text-xs font-semibold text-white hover:bg-black/85"><CheckCircle2 className="h-3.5 w-3.5" />Review & confirm</button> : null}
            </article>)}</div> : <div className="border border-dashed border-black/10 px-3 py-8 text-center"><CalendarDays className="mx-auto h-5 w-5 text-black/30" /><p className="mt-2 text-xs font-medium text-black/60">No appointments on this date</p><p className="mt-1 text-[11px] text-black/40">Choose a day with an appointment marker to review it.</p></div>}
          </aside>
        </div>
      </section>
      {addOpen ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !newSaving) setAddOpen(false); }}>
        <form onSubmit={createAppointment} role="dialog" aria-modal="true" aria-labelledby="agent-add-appointment-title" className="w-full max-w-lg border border-black/10 bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4"><div><span className="grid h-9 w-9 place-items-center bg-[#DE141C] text-white"><CalendarDays className="h-4 w-4" /></span><h2 id="agent-add-appointment-title" className="mt-3 text-lg font-semibold">Add customer appointment</h2><p className="mt-1 text-xs leading-5 text-black/55">Choose an assigned inquiry and enter the agreed meeting details.</p></div><button type="button" onClick={() => setAddOpen(false)} disabled={newSaving} aria-label="Close appointment form" className="grid h-8 w-8 place-items-center border border-black/10 text-black/55 hover:bg-zinc-50"><X className="h-4 w-4" /></button></div>
          {assignedInquiries.length ? <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-black/65">Customer inquiry<select required value={leadId} onChange={(event) => setLeadId(event.target.value)} className="mt-1.5 h-10 w-full border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-black/40">
              {assignedInquiries.map((inquiry) => {
                const relation = inquiry.properties;
                const propertyName = Array.isArray(relation) ? relation[0]?.title : relation?.title;
                return <option key={inquiry.id} value={inquiry.id}>{inquiry.buyer_name || inquiry.buyer_email || "Customer"} — {propertyName || "General inquiry"}</option>;
              })}
            </select></label>
            <label className="block text-xs font-medium text-black/65">Date and time<input required type="datetime-local" value={newDateTime} onChange={(event) => setNewDateTime(event.target.value)} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} className="mt-1.5 h-10 w-full border border-black/10 bg-white px-3 text-sm text-black outline-none focus:border-black/40" /></label>
            <label className="block text-xs font-medium text-black/65">Location or meeting details<input required maxLength={500} value={newLocation} onChange={(event) => setNewLocation(event.target.value)} placeholder="Property address, call, or online meeting link" className="mt-1.5 h-10 w-full border border-black/10 bg-white px-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-black/40" /></label>
            <label className="block text-xs font-medium text-black/65">Notes <span className="font-normal text-black/40">(optional)</span><textarea maxLength={2000} rows={3} value={newNotes} onChange={(event) => setNewNotes(event.target.value)} placeholder="Anything the customer or agent should prepare" className="mt-1.5 w-full resize-y border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none placeholder:text-black/35 focus:border-black/40" /></label>
            <label className="flex cursor-pointer items-start gap-2.5 border border-black/10 bg-zinc-50 p-3 text-xs leading-5 text-black/70"><input type="checkbox" checked={newReady} onChange={(event) => setNewReady(event.target.checked)} className="mt-1 accent-[#DE141C]" /><span>The customer agreed to this date and time, and I verified the meeting location or call details.</span></label>
          </div> : <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">You need an assigned customer inquiry before you can add an appointment.</p>}
          {newError ? <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{newError}</p> : null}
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setAddOpen(false)} disabled={newSaving} className="h-9 border border-black/10 px-4 text-xs font-medium hover:bg-zinc-50">Cancel</button><button type="submit" disabled={!assignedInquiries.length || !leadId || !newLocation.trim() || !newReady || newSaving} className="h-9 bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40">{newSaving ? "Saving..." : "Add confirmed appointment"}</button></div>
        </form>
      </div> : null}
      {confirming ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setConfirming(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="agent-confirm-appointment-title" className="w-full max-w-md border border-black/10 bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4"><div><span className="grid h-9 w-9 place-items-center bg-[#DE141C] text-white"><ShieldCheck className="h-4 w-4" /></span><h2 id="agent-confirm-appointment-title" className="mt-3 text-lg font-semibold">Confirm this appointment?</h2><p className="mt-1 text-xs leading-5 text-black/55">Review the booking and verify the arrangements with the customer before confirming.</p></div><button type="button" onClick={() => setConfirming(null)} disabled={saving} aria-label="Close confirmation" className="grid h-8 w-8 place-items-center border border-black/10 text-black/55 hover:bg-zinc-50"><X className="h-4 w-4" /></button></div>
          <dl className="mt-4 grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 border-y border-black/10 py-3 text-xs">
            <dt className="text-black/45">Customer</dt><dd className="font-medium">{confirming.buyer_name}</dd>
            <dt className="text-black/45">Property</dt><dd className="font-medium">{confirming.property_title}</dd>
            <dt className="text-black/45">Date & time</dt><dd className="font-medium">{formatDate(dateKey(confirming.scheduled_at), { month: "long", day: "numeric", year: "numeric" })} · {formatTime(confirming.scheduled_at)}</dd>
            <dt className="text-black/45">Location</dt><dd className="font-medium">{confirming.location || "Not specified"}</dd>
            <dt className="text-black/45">Meeting type</dt><dd className="font-medium capitalize">{confirming.appointment_type.replaceAll("_", " ")}</dd>
          </dl>
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-black/70"><input type="checkbox" checked={ready} onChange={(event) => setReady(event.target.checked)} className="mt-1 accent-[#DE141C]" /><span>I verified the date and time with the customer, and the meeting location or call details are ready.</span></label>
          {error ? <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirming(null)} disabled={saving} className="h-9 border border-black/10 px-4 text-xs font-medium hover:bg-zinc-50">Back</button><button type="button" onClick={() => void confirmAppointment()} disabled={!ready || saving} className="h-9 bg-[#111111] px-4 text-xs font-semibold text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Confirming..." : "Confirm appointment"}</button></div>
        </section>
      </div> : null}
    </>
  );
}
