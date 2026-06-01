import React from "react";

export default function SectionHeader({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="mt-1.5 h-[2.2em] w-[3px] shrink-0 rounded-full bg-[#DE141C]" aria-hidden="true" />
      <div>
        <h2 className="font-semibold leading-tight text-zinc-900" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-[2px] font-normal leading-tight text-zinc-400" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
