"use client";

import { useState } from "react";

export function InquireCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
            <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 8l8 5 8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-black">Inquire Us</p>
            <p className="text-[11px] text-black/45">Let&apos;s connect and inquire about the property</p>
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-black/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {["Email", "Name", "Subject", "Message"].map((field) => (
            <input
              key={field}
              className="h-10 w-full border-b border-black/10 px-2 text-sm outline-none placeholder:text-black/35"
              placeholder={field}
            />
          ))}
          <button className="mt-2 h-10 w-full rounded-sm bg-[#DE141C] text-sm font-semibold text-white transition-colors hover:bg-[#c51018]">
            Send Inquiry
          </button>
        </div>
      )}
    </div>
  );
}