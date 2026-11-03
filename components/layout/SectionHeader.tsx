import React from "react";

export default function SectionHeader({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3.5">
      <span className="mt-1.5 h-[2.2em] w-[2px] shrink-0 bg-[#DE141C]" aria-hidden="true" />
      <div>
        <h2 className="font-semibold leading-tight tracking-[-0.03em] text-[#1C1B19]" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px" }}>
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
