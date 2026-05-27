export function formatPHP(value: number): string {
  // Ensure number formatting without mojibake.
  if (!Number.isFinite(value)) return "₱0";

  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback (in case Intl config differs)
    return `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
  }
}

export function formatPHPWhole(value: number): string {
  if (!Number.isFinite(value)) return "₱0";

  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
  }
}

