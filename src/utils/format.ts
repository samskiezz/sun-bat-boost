// Safe formatting utilities to prevent .toLocaleString() crashes
export const formatNumber = (
  v: unknown,
  opts: Intl.NumberFormatOptions = {}
) => (typeof v === "number" && Number.isFinite(v)
  ? new Intl.NumberFormat("en-AU", opts).format(v)
  : "—");

export const formatCurrency = (v: unknown, currency = "AUD") =>
  formatNumber(v, { style: "currency", currency, maximumFractionDigits: 0 });

export const formatKWh = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? `${formatNumber(v)} kWh` : "—";

export const formatPercent = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";

export const formatDecimal = (v: unknown, decimals = 1) =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(decimals) : "—";

export const formatDateTime = (v: unknown) =>
  (typeof v === "string" || v instanceof Date) && v ? new Date(v).toLocaleString() : "—";

// Safe accessor for potentially undefined values
export const safe = (n: unknown, fallback?: number) =>
  (typeof n === "number" && Number.isFinite(n)) ? n : fallback;