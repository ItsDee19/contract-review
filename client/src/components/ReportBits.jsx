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

/* ── 0-100 overall-risk banding ──────────────────────────────────── */
export function riskBand(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return { label: "Unscored", text: "text-navy", bg: "bg-navy", soft: "bg-navy/5", ring: "border-navy/20" };
  if (n >= 67) return { label: "High risk", text: "text-danger", bg: "bg-danger", soft: "bg-danger/5", ring: "border-danger/30" };
  if (n >= 34) return { label: "Moderate risk", text: "text-amber-600", bg: "bg-amber-500", soft: "bg-amber-50", ring: "border-amber-400/50" };
  return { label: "Lower risk", text: "text-emerald-700", bg: "bg-emerald-600", soft: "bg-emerald-50/70", ring: "border-emerald-500/40" };
}

function verdictTone(verdict = "") {
  const v = verdict.toLowerCase();
  if (v.includes("do not") || v.includes("don't")) return "bg-danger text-white";
  if (v.includes("negotiate")) return "bg-amber-500 text-white";
  if (v.includes("safe")) return "bg-emerald-600 text-white";
  return "bg-navy text-white";
}

export function PriorityBadge({ priority }) {
  const p = (priority || "").toLowerCase();
  const styles = p === "high" ? "bg-danger/10 text-danger" : p === "medium" ? "bg-amber-500/10 text-amber-700" : "bg-navy/5 text-navy/60";
  const label = p === "high" ? "High priority" : p === "medium" ? "Medium priority" : "Low priority";
  return <span className={`inline-block text-[11px] font-bold uppercase tracking-wide rounded px-2 py-0.5 ${styles}`}>{label}</span>;
}

/* ── Overall risk verdict banner (top of report) ─────────────────── */
export function RiskVerdict({ overallRisk }) {
  if (!overallRisk) return null;
  const { score, verdict, rationale } = overallRisk;
  const band = riskBand(score);
  const hasScore = Number.isFinite(Number(score));
  const pct = hasScore ? Math.min(100, Math.max(0, Number(score))) : 0;

  return (
    <div className={`rounded-xl border ${band.ring} ${band.soft} p-5 sm:p-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        {/* Score dial */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center">
            <div className={`text-4xl font-extrabold leading-none ${band.text}`}>
              {hasScore ? pct : "—"}
              <span className="text-base font-bold text-navy/40">/100</span>
            </div>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-navy/50">Risk score</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block text-xs font-bold uppercase tracking-wide rounded-full px-3 py-1 ${verdictTone(verdict)}`}>
              {verdict}
            </span>
            <span className={`text-xs font-semibold ${band.text}`}>{band.label}</span>
          </div>
          {/* Bar */}
          <div className="mt-3 h-2 w-full rounded-full bg-navy/10 overflow-hidden" aria-hidden>
            <div className={`h-full rounded-full ${band.bg} transition-all`} style={{ width: `${hasScore ? pct : 0}%` }} />
          </div>
          {rationale && <p className="mt-3 text-sm leading-relaxed text-navy/80">{rationale}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Deal snapshot (parties + key terms) ─────────────────────────── */
export function DealSnapshot({ dealSummary }) {
  const parties = dealSummary?.parties || [];
  const snapshot = dealSummary?.snapshot || [];
  if (!parties.length && !snapshot.length) {
    return <p className="text-sm text-navy/60">No deal summary could be extracted.</p>;
  }
  return (
    <div className="space-y-4">
      {parties.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy/50">Parties</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {parties.map((p, i) => (
              <li key={i} className="text-sm font-medium bg-navy/5 rounded-md px-2.5 py-1">{p}</li>
            ))}
          </ul>
        </div>
      )}
      {snapshot.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {snapshot.map((s, i) => (
            <div key={i} className="border-b border-navy/10 pb-2">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-navy/50">{s.label}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* ── Missing-clause (omission) list ──────────────────────────────── */
export function MissingClausesBody({ items = [] }) {
  if (!items.length) {
    return <p className="text-sm text-navy/60">No critical omissions found — the expected protections appear to be present.</p>;
  }
  return (
    <ul className="space-y-4">
      {items.map((m, i) => (
        <li key={i} className="border border-amber-400/40 rounded-lg p-4 bg-amber-50/40">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <h3 className="font-bold">Missing: {m.clause}</h3>
            <SeverityBadge severity={m.severity} />
          </div>
          {m.whyItMatters && <p className="mt-2 text-sm leading-relaxed">{m.whyItMatters}</p>}
          {m.suggestedAddition && (
            <div className="mt-3 border-t border-amber-400/30 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Suggested clause to add</p>
              <p className="mt-1 text-sm leading-relaxed text-navy/80">{m.suggestedAddition}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── Negotiation playbook ────────────────────────────────────────── */
export function NegotiationBody({ items = [] }) {
  if (!items.length) {
    return <p className="text-sm text-navy/60">No negotiation points generated.</p>;
  }
  return (
    <ul className="space-y-4">
      {items.map((n, i) => (
        <li key={i} className="border border-navy/15 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <h3 className="font-bold">{n.issue}</h3>
            <PriorityBadge priority={n.priority} />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-md bg-emerald-50/70 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Ask for</p>
              <p className="mt-1 text-sm leading-relaxed">{n.ask}</p>
            </div>
            <div className="rounded-md bg-navy/[0.03] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-navy/50">Acceptable fallback</p>
              <p className="mt-1 text-sm leading-relaxed">{n.fallback}</p>
            </div>
          </div>
          {n.rationale && (
            <p className="mt-2 text-xs text-navy/65">
              <span className="font-semibold text-navy">Why this is reasonable:</span> {n.rationale}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── Obligations / deadlines matrix ──────────────────────────────── */
export function ObligationsBody({ items = [] }) {
  if (!items.length) {
    return <p className="text-sm text-navy/60">No discrete obligations or deadlines were extracted.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-navy/50 border-b border-navy/15">
            <th className="py-2 pr-3 font-bold">Who</th>
            <th className="py-2 pr-3 font-bold">Must do</th>
            <th className="py-2 pr-3 font-bold">By when</th>
            <th className="py-2 font-bold">If missed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy/10 align-top">
          {items.map((o, i) => (
            <tr key={i}>
              <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{o.party}</td>
              <td className="py-2.5 pr-3 leading-relaxed">{o.obligation}</td>
              <td className="py-2.5 pr-3 leading-relaxed text-navy/70 whitespace-nowrap">{o.deadline}</td>
              <td className="py-2.5 leading-relaxed text-navy/70">{o.consequence || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
