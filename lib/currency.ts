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

