"use client";

import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM",
];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const steps = [
  { label: "Pick date" },
  { label: "Confirm" },
  { label: "Done" },
];

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 5.5H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M4.5 1V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M9.5 1V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconHourglass() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 1.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M3 12.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M4 1.5C4 1.5 4.5 5 7 6.5C9.5 8 10 12.5 10 12.5H4C4 12.5 4.5 8 7 6.5C9.5 5 10 1.5 10 1.5H4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 12.5C2 10.015 4.239 8 7 8C9.761 8 12 10.015 12 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 2.5C2.5 2.5 2 5 4.5 7.5C7 10 9.5 11.5 9.5 11.5L11.5 9.5L9 7.5L7.5 9C7.5 9 5.5 8 5 7.5C4.5 7 3.5 5 3.5 5L5 3.5L3 1L2.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 4.5L7 8L12.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function AppointmentPage() {
  const today = new Date();
  const [step, setStep] = useState(0);
  const [curYear, setCurYear] = useState(() => {
    const t = new Date();
    const cutoff = t.getDate() + 3;
    const daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    return cutoff > daysInMonth && t.getMonth() === 11 ? t.getFullYear() + 1 : t.getFullYear();
  });
  const [curMonth, setCurMonth] = useState(() => {
    const t = new Date();
    const cutoff = t.getDate() + 3;
    const daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    return cutoff > daysInMonth ? (t.getMonth() + 1) % 12 : t.getMonth();
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [calHeight, setCalHeight] = useState<number | undefined>(undefined);

  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calRef.current) return;
    const observer = new ResizeObserver(() => {
      if (calRef.current) setCalHeight(calRef.current.offsetHeight);
    });
    observer.observe(calRef.current);
    setCalHeight(calRef.current.offsetHeight);
    return () => observer.disconnect();
  }, [step]);

  const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(curYear, curMonth, 1).getDay();

  const prevMonth = () => {
    if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); }
    else setCurMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); }
    else setCurMonth(m => m + 1);
    setSelectedDay(null);
  };

  const isPast = (d: number) => {
    const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
    return new Date(curYear, curMonth, d) < cutoff;
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = phone.trim().length >= 7;
  const formValid = emailValid && phoneValid && name.trim().length > 0;

  const formattedDate = selectedDay
    ? `${MONTHS[curMonth]} ${selectedDay}, ${curYear}`
    : "";

  const inputWrapClass =
    "flex items-center gap-2.5 border border-black/12 rounded-lg px-3 h-[38px] bg-white focus-within:border-[#DE141C] focus-within:ring-2 focus-within:ring-[#DE141C]/10 transition";

  return (
    <main className="min-h-screen bg-white text-[#171717]">
      <Navbar links={navLinks} />

      <section className="mx-auto w-full max-w-[1100px] px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_130px] divide-x divide-black/8">

          {/* LEFT: Info */}
          <aside className="self-start border-b border-black/8 pb-8 lg:border-b-0 lg:pr-10 lg:pb-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/40">Book our</p>
            <h1 className="mt-0.5 text-[36px] font-bold tracking-[-0.03em] leading-[1.05] text-[#0f0f0f]">
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

            {/* Mini stepper */}
            <div className="mt-5 flex items-center">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div
                    className={`h-[28px] w-[28px] rounded-full flex items-center justify-center text-[11px] font-medium border-[1.5px] transition-all shrink-0 leading-none ${
                      step > i
                        ? "bg-[#DE141C] border-[#DE141C] text-white"
                        : step === i
                        ? "bg-[#DE141C] border-[#DE141C] text-white"
                        : "border-black/15 text-black/35 bg-white"
                    }`}
                  >
                    {step > i ? "✓" : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-1.5 transition-colors ${step > i ? "bg-[#DE141C]" : "bg-black/10"}`} />
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* CENTER: Step content */}
          <div ref={calRef} className="self-start px-0 pt-8 lg:px-8 lg:pt-0 border-b border-black/8 pb-8 lg:border-b-0 lg:pb-0">

            {/* Step 0: Pick date */}
            {step === 0 && (
              <>
                <div className="flex items-baseline justify-between mb-5">
                  <p className="text-[15px] font-medium text-black">Pick a date</p>
                  {selectedDay && selectedTime && (
                    <p className="text-[12px] text-black/45">
                      {MONTHS[curMonth].slice(0, 3)} {selectedDay} · {selectedTime}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pb-5 border-b border-black/7">
                  <button
                    onClick={prevMonth}
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-black/10 text-black/60 hover:bg-black/4 transition-colors"
                  >
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <span className="text-[14.5px] font-medium text-black/75">{MONTHS[curMonth]} {curYear}</span>
                  <button
                    onClick={nextMonth}
                    className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#fde7e8] text-[#DE141C] hover:bg-[#fbd7d9] transition-colors"
                  >
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-1">
                  {weekdays.map(w => (
                    <div key={w} className="text-center text-[10.5px] font-semibold tracking-[0.1em] text-black/30 uppercase">{w}</div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                    <button
                      key={d}
                      disabled={isPast(d)}
                      onClick={() => setSelectedDay(d)}
                      className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13.5px] leading-none transition-colors ${
                        selectedDay === d
                          ? "bg-[#DE141C] font-semibold text-white"
                          : isPast(d)
                          ? "text-black/20 cursor-default"
                          : "text-black/65 hover:bg-black/5 hover:text-black"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 1: Confirm + fields */}
            {step === 1 && (
              <>
                <p className="text-[15px] font-medium text-black mb-5">Confirm your booking</p>

                <div className="bg-black/[0.03] rounded-xl p-4 mb-5 space-y-0 divide-y divide-black/6">
                  {[
                    { icon: <IconCalendar />, label: "Date",     value: formattedDate  },
                    { icon: <IconClock />,    label: "Time",     value: selectedTime!  },
                    { icon: <IconHourglass />,label: "Duration", value: "30 minutes"   },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-3 text-[13.5px] py-2.5 first:pt-0 last:pb-0">
                      <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-black/10 text-[#DE141C] shrink-0">
                        {row.icon}
                      </span>
                      <span className="text-black/45 min-w-[64px] text-[12px]">{row.label}</span>
                      <span className="font-medium text-black">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] text-black/50 mb-1.5">Full name</label>
                    <div className={inputWrapClass}>
                      <span className="text-black/35 shrink-0"><IconUser /></span>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Juan dela Cruz"
                        className="flex-1 border-none outline-none bg-transparent text-[13.5px] text-black placeholder:text-black/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] text-black/50 mb-1.5">Contact number</label>
                    <div className={inputWrapClass}>
                      <span className="text-black/35 shrink-0"><IconPhone /></span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+63 912 345 6789"
                        className="flex-1 border-none outline-none bg-transparent text-[13.5px] text-black placeholder:text-black/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] text-black/50 mb-1.5">Email address</label>
                    <div className={inputWrapClass}>
                      <span className="text-black/35 shrink-0"><IconMail /></span>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="flex-1 border-none outline-none bg-transparent text-[13.5px] text-black placeholder:text-black/30"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Success */}
            {step === 2 && (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-14 h-14 rounded-full bg-[#fde7e8] flex items-center justify-center mb-4">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-3" stroke="#DE141C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 5a3 3 0 1 0 6 0" stroke="#DE141C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12l2 2 4-4" stroke="#DE141C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                <p className="text-[18px] font-semibold text-black mb-2">You&apos;re all set!</p>
                <p className="text-[13.5px] text-black/50 leading-[1.7] max-w-xs">
                  Your appointment has been booked. A confirmation has been sent to{" "}
                  <span className="text-[#DE141C] font-medium">{email}</span>.
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fde7e8] text-[#DE141C] text-[12px] font-medium">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  {formattedDate} · {selectedTime}
                </div>

                {/* Waiting notice */}
                <div className="mt-4 flex items-start gap-2.5 bg-black/[0.03] rounded-xl px-4 py-3 max-w-xs text-left border border-black/8">
                  <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="#DE141C" strokeWidth="1.8"/>
                    <path d="M12 7v5l3 3" stroke="#DE141C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[12.5px] text-black/50 leading-[1.65]">
                    Please wait <span className="text-black font-medium">1–2 business days</span> for our agents to confirm your appointment. You will receive an email once it&apos;s confirmed.
                  </p>
                </div>

                {/* Return to Project List */}
                <Link
                  href="/project-list"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-black/10 text-[13px] text-black/55 hover:bg-black/4 hover:text-black transition-colors group"
                >
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                    className="transition-transform group-hover:-translate-x-0.5"
                  >
                    <path d="M19 12H5M5 12L11 6M5 12L11 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Return to Project List
                </Link>
              </div>
            )}

            {/* Actions — steps 0 and 1 only */}
            {step < 2 && (
              <div className={`mt-6 flex gap-2 ${step === 0 ? "justify-end" : "justify-between"}`}>
                {step > 0 && (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="px-4 py-2 rounded-lg border border-black/10 text-[13px] text-black/60 hover:bg-black/4 transition-colors"
                  >
                    ← Back
                  </button>
                )}
                <button
                  disabled={step === 0 ? !(selectedDay && selectedTime) : !formValid}
                  onClick={() => setStep(s => s + 1)}
                  className="px-5 py-2 rounded-lg bg-[#DE141C] text-white text-[13px] font-medium disabled:opacity-40 hover:bg-[#c01018] transition-colors"
                >
                  {step === 0 ? "Continue →" : "Confirm booking"}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Time slots — only on step 0 */}
          {step === 0 && (
            <aside
              className="self-start flex flex-row flex-wrap gap-2 pt-8 lg:flex-col lg:flex-nowrap lg:gap-2 lg:pl-6 lg:pt-0 lg:overflow-y-auto lg:[&::-webkit-scrollbar]:hidden lg:[scrollbar-width:none]"
              style={{ maxHeight: calHeight ? `${calHeight}px` : undefined }}
            >
              {timeSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  className={`rounded-full border px-3 py-2 text-[11.5px] font-medium whitespace-nowrap transition-colors ${
                    selectedTime === slot
                      ? "border-[#DE141C] bg-[#DE141C] text-white"
                      : "border-black/15 bg-white text-black/60 hover:bg-black/4 hover:border-black/25"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </aside>
          )}

        </div>
      </section>

      <Footer />
    </main>
  );
}