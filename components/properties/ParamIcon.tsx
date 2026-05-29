export function ParamIcon({ type }: { type: string }) {
  if (type === "area") return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
  if (type === "grid") return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none">
      <rect x="3.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
  if (type === "levels") return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none">
      <path d="M3 21h18M5 21V10l7-7 7 7v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21v-5h6v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === "bed") return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none">
      <path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === "bath") return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none">
      <path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (type === "garage") return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none">
      <path d="M3 21V10l9-7 9 7v11H3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21v-4h6v4M3 14h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
  return null;
}