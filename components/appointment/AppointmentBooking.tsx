"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM",
];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const steps = ["Pick date", "Confirm", "Done"] as const;

function getFromLabel(fromPath: string) {
  const slug = fromPath.split("/").filter(Boolean).pop() || "";

  if (!slug || slug === "project-list") {
    return "Project List";
  }

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getInitialMonth(date: Date) {
  const cutoff = date.getDate() + 3;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  return cutoff > daysInMonth ? (date.getMonth() + 1) % 12 : date.getMonth();
}

function getInitialYear(date: Date) {
  const cutoff = date.getDate() + 3;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  return cutoff > daysInMonth && date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear();
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 5.5H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4.5 1V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9.5 1V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconHourglass() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 1.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 12.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 1.5C4 1.5 4.5 5 7 6.5C9.5 8 10 12.5 10 12.5H4C4 12.5 4.5 8 7 6.5C9.5 5 10 1.5 10 1.5H4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 12.5C2 10.015 4.239 8 7 8C9.761 8 12 10.015 12 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 2.5C2.5 2.5 2 5 4.5 7.5C7 10 9.5 11.5 9.5 11.5L11.5 9.5L9 7.5L7.5 9C7.5 9 5.5 8 5 7.5C4.5 7 3.5 5 3.5 5L5 3.5L3 1L2.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 4.5L7 8L12.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppointmentBooking() {
  const searchParams = useSearchParams();
  const fromPath = searchParams.get("from") || "/project-list";
  const fromLabel = getFromLabel(fromPath);
  const propertyLabel = searchParams.get("property")?.trim() || fromLabel;
  const propertySlug = fromPath.split("/").filter(Boolean).pop() || "";

  const today = new Date();
  const minBookDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);

  const [step, setStep] = useState(0);
  const [curYear, setCurYear] = useState(() => getInitialYear(today));
  const [curMonth, setCurMonth] = useState(() => getInitialMonth(today));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calHeight, setCalHeight] = useState<number | undefined>(undefined);

  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = calRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      setCalHeight(element.offsetHeight);
    });

    observer.observe(element);
    setCalHeight(element.offsetHeight);

    return () => observer.disconnect();
  }, [step]);

  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(curYear, curMonth, 1).getDay();

  const prevMonth = () => {
    if (curMonth === 0) {
      setCurMonth(11);
      setCurYear((year) => year - 1);
    } else {
      setCurMonth((month) => month - 1);
    }

    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (curMonth === 11) {
      setCurMonth(0);
      setCurYear((year) => year + 1);
    } else {
      setCurMonth((month) => month + 1);
    }

    setSelectedDay(null);
  };

  const isPast = (day: number) => new Date(curYear, curMonth, day) < minBookDate;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = phone.trim().length >= 7;
  const formValid = emailValid && phoneValid && name.trim().length > 0;
  const formattedDate = selectedDay ? `${MONTHS[curMonth]} ${selectedDay}, ${curYear}` : "";
  const inputBase =
    "w-full border border-black/12 rounded-lg bg-white text-[13px] text-black placeholder:text-black/28 outline-none focus:border-[#DE141C] focus:ring-2 focus:ring-[#DE141C]/10 transition h-[34px]";

  async function confirmBooking() {
    if (!formValid || !formattedDate || !selectedTime || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitStatus("Saving appointment request...");
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: name,
        buyerPhone: phone,
        buyerEmail: email,
        date: formattedDate,
        time: selectedTime,
        propertySlug,
        propertyTitle: propertyLabel,
      }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      setSubmitStatus("Unable to save appointment. Please try again.");
      return;
    }
    setSubmitStatus("");
    setStep(2);
  }

  return (
    <section className="mx-auto w-full max-w-[1100px] px-6 py-16 lg:py-20">
      <div className="grid grid-cols-1 divide-x divide-black/8 lg:grid-cols-[280px_minmax(0,1fr)_130px]">
        <aside className="self-start border-b border-black/8 pb-8 lg:border-b-0 lg:pb-0 lg:pr-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/40">Book our</p>
          <h1 className="mt-0.5 text-[36px] font-bold leading-[1.05] tracking-[-0.03em] text-[#0f0f0f]">
            APPOINTMENT
          </h1>

          <div className="mt-5 flex items-center gap-2.5 text-[13px] text-black/50">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-black/12">
              <IconClock />
            </span>
            <span>30 min</span>
          </div>

          <p className="mt-5 text-[13.5px] leading-[1.75] text-black/48">
            See our property in action with a live 1-on-1 session. In just 30 minutes, we&apos;ll walk you
            through the key features, answer your questions, and show you how it can fit your business needs.
          </p>
          <p className="mt-3 text-[11.5px] leading-[1.6] text-black/35 italic">
            * Appointments must be booked at least 3 days in advance. Available 9:00 AM – 4:00 PM.
          </p>

          <div className="mt-5 flex items-center">
            {steps.map((label, index) => (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div
                  className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-[11px] font-medium leading-none transition-all ${
                    step >= index ? "border-[#DE141C] bg-[#DE141C] text-white" : "border-black/15 bg-white text-black/35"
                  }`}
                >
                  {step > index ? "✓" : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-1.5 h-px flex-1 transition-colors ${step > index ? "bg-[#DE141C]" : "bg-black/10"}`} />
                )}
              </div>
            ))}
          </div>
        </aside>

        <div ref={calRef} className="self-start border-b border-black/8 px-0 pb-8 pt-8 lg:border-b-0 lg:px-8 lg:pb-0 lg:pt-0">
          {step === 0 && (
            <>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Link
                    href={fromPath}
                    className="group flex items-center gap-1.5 text-[12px] text-black/38 transition-colors hover:text-[#DE141C]"
                    title={`Back to ${fromLabel}`}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="transition-transform group-hover:-translate-x-0.5"
                    >
                      <path d="M19 12H5M5 12L11 6M5 12L11 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{fromLabel}</span>
                  </Link>
                  <span className="select-none text-[10px] text-black/15">|</span>
                  <p className="text-[14px] font-medium text-black">Pick a date</p>
                </div>
                {selectedDay && selectedTime && (
                  <p className="text-[11.5px] text-black/40 tabular-nums">
                    {MONTHS[curMonth].slice(0, 3)} {selectedDay} · {selectedTime}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-black/7 pb-5">
                <button
                  onClick={prevMonth}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-black/10 text-black/60 transition-colors hover:bg-black/4"
                >
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="text-[14.5px] font-medium text-black/75">
                  {MONTHS[curMonth]} {curYear}
                </span>
                <button
                  onClick={nextMonth}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#fde7e8] text-[#DE141C] transition-colors hover:bg-[#fbd7d9]"
                >
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-1">
                {weekdays.map((weekday) => (
                  <div key={weekday} className="text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-black/30">
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                  <div key={`empty-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => (
                  <button
                    key={day}
                    disabled={isPast(day)}
                    onClick={() => setSelectedDay(day)}
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13.5px] leading-none transition-colors ${
                      selectedDay === day
                        ? "bg-[#DE141C] font-semibold text-white"
                        : isPast(day)
                          ? "cursor-default text-black/20"
                          : "text-black/65 hover:bg-black/5 hover:text-black"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="mb-4 text-[14px] font-medium text-black">Confirm your booking</p>

              <div className="mb-5 flex flex-wrap gap-2">
                {[
                  { icon: <IconCalendar />, value: formattedDate },
                  { icon: <IconClock />, value: selectedTime || "" },
                  { icon: <IconHourglass />, value: "30 min" },
                  { icon: <IconUser />, value: propertyLabel },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.025] px-3 py-1.5 text-[12px] text-black/65"
                  >
                    <span className="text-[#DE141C]">{item.icon}</span>
                    {item.value}
                  </div>
                ))}
              </div>

              <div className="mb-4 border-t border-black/7" />

              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/35">Your details</p>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-black/45">Full name</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30">
                      <IconUser />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Juan dela Cruz"
                      className={`${inputBase} pl-7 pr-3`}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-black/45">Contact number</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30">
                      <IconPhone />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+63 912 345 6789"
                      className={`${inputBase} pl-7 pr-3`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-black/45">Email address</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30">
                    <IconMail />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={`${inputBase} pl-7 pr-3`}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fde7e8]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-3" stroke="#DE141C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 5a3 3 0 1 0 6 0" stroke="#DE141C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" stroke="#DE141C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <p className="mb-2 text-[18px] font-semibold text-black">You&apos;re all set!</p>
              <p className="max-w-xs text-[13.5px] leading-[1.7] text-black/50">
                Your appointment for <span className="font-medium text-black">{propertyLabel}</span> has been booked. A confirmation has been sent to <span className="font-medium text-[#DE141C]">{email}</span>.
              </p>

              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fde7e8] px-3 py-1.5 text-[12px] font-medium text-[#DE141C]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  {formattedDate}
                </div>

                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fde7e8] px-3 py-1.5 text-[12px] font-medium text-[#DE141C]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {selectedTime}
                </div>

                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-[12px] font-medium text-black/70">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 19.5V8.6c0-.8.4-1.6 1.1-2l5.9-3.4c.7-.4 1.6-.4 2.3 0l5.9 3.4c.7.4 1.1 1.2 1.1 2v10.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7.5 19.5V14h9v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {propertyLabel}
                </div>
              </div>

              <div className="mt-4 flex w-full max-w-xl items-start gap-2.5 rounded-xl border border-black/8 bg-black/[0.03] px-4 py-3 text-left">
                <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="#DE141C" strokeWidth="1.8" />
                  <path d="M12 7v5l3 3" stroke="#DE141C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[12.5px] leading-[1.65] text-black/50">
                  Please wait <span className="font-medium text-black">1–2 business days</span> for our agents to confirm your appointment. You will receive an email once it&apos;s confirmed.
                </p>
              </div>

              <Link
                href="/project-list"
                className="group mt-6 ml-auto inline-flex items-center gap-2 rounded-full bg-[#DE141C] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#c01018]"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="transition-transform group-hover:-translate-x-0.5"
                >
                  <path d="M19 12H5M5 12L11 6M5 12L11 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Browse more properties
              </Link>
            </div>
          )}

          {step < 2 && (
            <div className={`mt-5 flex gap-2 ${step === 0 ? "justify-end" : "justify-between"}`}>
              {step > 0 && (
                <button
                  onClick={() => setStep((currentStep) => currentStep - 1)}
                  className="rounded-lg border border-black/10 px-4 py-2 text-[13px] text-black/60 transition-colors hover:bg-black/4"
                >
                  ← Back
                </button>
              )}
              <button
                disabled={isSubmitting || (step === 0 ? !(selectedDay && selectedTime) : !formValid)}
                onClick={() => {
                  if (step === 0) setStep(1);
                  else void confirmBooking();
                }}
                className="rounded-lg bg-[#DE141C] px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#c01018] disabled:opacity-40"
              >
                {step === 0 ? "Continue →" : isSubmitting ? "Saving..." : "Confirm booking"}
              </button>
            </div>
          )}
          {submitStatus ? <p className="mt-2 text-right text-xs text-black/45">{submitStatus}</p> : null}
        </div>

        {step === 0 && (
          <aside
            className="self-start flex flex-row flex-wrap gap-2 pt-8 lg:flex-col lg:flex-nowrap lg:gap-2 lg:overflow-y-auto lg:pl-6 lg:pt-0 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
            style={{ maxHeight: calHeight ? `${calHeight}px` : undefined }}
          >
            {timeSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                className={`rounded-full border px-3 py-2 text-[11.5px] font-medium whitespace-nowrap transition-colors ${
                  selectedTime === slot
                    ? "border-[#DE141C] bg-[#DE141C] text-white"
                    : "border-black/15 bg-white text-black/60 hover:border-black/25 hover:bg-black/4"
                }`}
              >
                {slot}
              </button>
            ))}
          </aside>
        )}
      </div>
    </section>
  );
}
