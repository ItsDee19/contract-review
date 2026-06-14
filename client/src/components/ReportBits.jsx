import { useState } from "react";

export function CollapsibleCard({ title, count, accent = "navy", defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const accentBar = accent === "danger" ? "bg-danger" : "bg-navy";
  return (
    <section className="border border-navy/15 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-navy/[0.03] no-print"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className={`h-5 w-1 rounded-full shrink-0 ${accentBar}`} />
          <span className="font-bold truncate">{title}</span>
          {typeof count === "number" && (
            <span className="text-xs font-semibold text-navy/55 bg-navy/5 rounded-full px-2 py-0.5 shrink-0">
              {count}
            </span>
          )}
        </span>
        <span className={`text-navy/50 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {/* Print-only header (button above is hidden via .no-print in print CSS) */}
      <div className="print-only items-center gap-3 px-4 sm:px-5 py-4" style={{ display: "none" }}>
        <span className={`h-5 w-1 rounded-full shrink-0 ${accentBar}`} />
        <span className="font-bold">{title}</span>
        {typeof count === "number" && (
          <span className="text-xs font-semibold text-navy/55 bg-navy/5 rounded-full px-2 py-0.5 shrink-0">
            {count}
          </span>
        )}
      </div>
      <div
        className={`px-4 sm:px-5 pb-5 border-t border-navy/10 pt-4 ${open ? "" : "hidden"}`}
        data-print-expand
      >
        {children}
      </div>
    </section>
  );
}

export function SeverityBadge({ severity }) {
  const s = (severity || "").toLowerCase();
  const styles =
    s === "high"
      ? "bg-danger text-white"
      : s === "medium"
      ? "bg-amber-500 text-white"
      : "bg-emerald-600 text-white";
  const label = s === "high" ? "High risk" : s === "medium" ? "Medium risk" : "Low risk";
  return (
    <span className={`inline-block text-[11px] font-bold uppercase tracking-wide rounded px-2 py-0.5 ${styles}`}>
      {label}
    </span>
  );
}

export function riskTone(score) {
  if (score >= 7) return { text: "text-danger", bg: "bg-danger", ring: "border-danger/40", label: "Dangerous" };
  if (score >= 4) return { text: "text-amber-600", bg: "bg-amber-500", ring: "border-amber-400/60", label: "Caution" };
  return { text: "text-emerald-700", bg: "bg-emerald-600", ring: "border-emerald-500/50", label: "Safe" };
}

export function RiskScore({ score = 1 }) {
  const n = Math.min(10, Math.max(1, Number(score) || 1));
  const tone = riskTone(n);
  return (
    <div className="flex items-center gap-2 shrink-0" title={`Risk ${n}/10 — ${tone.label}`}>
      <div className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`h-3 w-1 rounded-sm ${i < n ? tone.bg : "bg-navy/10"}`} />
        ))}
      </div>
      <span className={`text-xs font-bold ${tone.text}`}>{n}/10</span>
    </div>
  );
}
