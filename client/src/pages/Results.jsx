import { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { CollapsibleCard, SeverityBadge, RiskScore, riskTone } from "../components/ReportBits.jsx";

const PROOFING_LABELS = {
  vague_language: "Vague language",
  broken_ref: "Broken cross-reference",
  inconsistency: "Inconsistency",
  shall_misuse: "Shall / may misuse",
  undefined_term: "Undefined term",
};

/* ── Tiny copy-to-clipboard button with feedback ─────────────── */
function CopyButton({ text, label = "Copy", className = "" }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={copy}
      className={`no-print inline-flex items-center gap-1.5 text-xs font-semibold rounded-md px-2.5 py-1.5 transition-all ${
        copied
          ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
          : "bg-navy/5 text-navy/70 hover:bg-navy/10 hover:text-navy border border-navy/10"
      } ${className}`}
      title={copied ? "Copied!" : `Copy ${label.toLowerCase()}`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

export default function Results() {
  const report = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("contractsafe:report"));
    } catch {
      return null;
    }
  }, []);

  // ── Empty state ──
  if (!report) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold">No report yet</h1>
        <p className="mt-3 text-navy/60">
          Reports live only in this browser session and aren't stored anywhere.
          Run an analysis to see your results here.
        </p>
        <Link to="/review" className="btn-primary mt-6">Review a contract →</Link>
      </div>
    );
  }

  const {
    dangerZones = [],
    clauseReview = [],
    complianceFlags = [],
    redlines = [],
    roleSummary = {},
    proofingIssues = [],
    disclaimer,
    meta = {},
  } = report;

  const isLawyer = meta.userRole === "Lawyer";
  const highCount = clauseReview.filter((c) => Number(c.riskScore) >= 7).length;

  /* ── Helpers ──────────────────────────────────────────────────── */
  function handleDownloadPdf() {
    window.print();
  }

  function buildAllRedlinesText() {
    return redlines
      .map(
        (r, i) =>
          `--- Redline ${i + 1} ---\n\nORIGINAL:\n${r.original}\n\nSUGGESTED REWRITE (verify with a lawyer):\n${r.suggested}\n\nReason: ${r.reason || "N/A"}`
      )
      .join("\n\n");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* ── Print-only header ── */}
      <div className="print-header hidden">
        <h2 className="text-xl font-extrabold">ContractSafe — Contract Review Report</h2>
        <p className="text-sm text-navy/60 mt-1">
          {meta.contractType || "Contract"} · {meta.jurisdiction || "Indian Law"} · {meta.userRole || "Reader"} · Generated{" "}
          {meta.analyzedAt ? new Date(meta.analyzedAt).toLocaleDateString() : "today"}
        </p>
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/50">
            Contract report · {meta.contractType || "Contract"} · {meta.jurisdiction || "Indian Law"} · For a {meta.userRole || "reader"}
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-snug max-w-2xl">
            {roleSummary.headline || "Analysis complete."}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 no-print">
          <button
            onClick={handleDownloadPdf}
            className="btn-secondary !py-2 text-sm inline-flex items-center gap-2"
            title="Opens the print dialog — choose 'Save as PDF'"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <Link to="/review" className="btn-secondary !py-2 text-sm shrink-0">
            Review another
          </Link>
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 border border-navy/15 rounded-lg divide-x divide-y sm:divide-y-0 divide-navy/10 overflow-hidden text-center">
        {[
          [dangerZones.length, "Danger zones", dangerZones.length ? "text-danger" : ""],
          [highCount, "High-risk clauses", highCount ? "text-danger" : ""],
          [complianceFlags.length, "Compliance flags", complianceFlags.length ? "text-amber-600" : ""],
          [proofingIssues.length, "Drafting issues", ""],
        ].map(([n, label, tone]) => (
          <div key={label} className="px-3 py-4">
            <p className={`text-2xl font-extrabold ${tone || "text-navy"}`}>{n}</p>
            <p className="text-xs text-navy/55 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {/* ── 1. Danger zones ── */}
        <CollapsibleCard title="Danger zones" count={dangerZones.length} accent="danger" defaultOpen>
          {dangerZones.length === 0 ? (
            <p className="text-sm text-navy/60">No standout danger zones found. Still read the clause-by-clause review below.</p>
          ) : (
            <ol className="space-y-4">
              {dangerZones.map((d, i) => (
                <li key={i} className="border border-danger/25 rounded-lg p-4 bg-danger/[0.03]">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <h3 className="font-bold">{i + 1}. {d.title}</h3>
                    <SeverityBadge severity={d.severity} />
                  </div>
                  {d.excerpt && (
                    <blockquote className="mt-3 border-l-2 border-danger/50 pl-3 text-sm text-navy/70 italic">
                      &ldquo;{d.excerpt}&rdquo;
                    </blockquote>
                  )}
                  <p className="mt-3 text-sm leading-relaxed">{d.risk}</p>
                </li>
              ))}
            </ol>
          )}
        </CollapsibleCard>

        {/* ── 2. Clause by clause ── */}
        <CollapsibleCard title="Clause-by-clause review" count={clauseReview.length}>
          {clauseReview.length === 0 ? (
            <p className="text-sm text-navy/60">No clauses could be reviewed.</p>
          ) : (
            <ul className="max-h-[32rem] overflow-y-auto pr-1 divide-y divide-navy/10">
              {clauseReview.map((c, i) => {
                const tone = riskTone(Number(c.riskScore) || 1);
                return (
                  <li key={i} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{c.clauseTitle}</h3>
                      <RiskScore score={c.riskScore} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{c.explanation}</p>
                    {c.reason && (
                      <p className={`mt-1.5 text-sm leading-relaxed ${tone.text}`}>
                        <span className="font-semibold">{tone.label}:</span> {c.reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CollapsibleCard>

        {/* ── 3. Indian law compliance ── */}
        <CollapsibleCard title="Indian law compliance" count={complianceFlags.length}>
          {complianceFlags.length === 0 ? (
            <p className="text-sm text-navy/60">No statutory conflicts flagged against the acts we check.</p>
          ) : (
            <ul className="space-y-4">
              {complianceFlags.map((f, i) => (
                <li key={i} className="border border-navy/15 rounded-lg p-4">
                  <p className="text-sm font-bold text-danger">
                    ⚑ Violates {f.section ? `${f.section}, ` : ""}{f.act}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{f.issue}</p>
                  {f.suggestion && (
                    <p className="mt-2 text-sm leading-relaxed text-navy/70">
                      <span className="font-semibold text-navy">Fix:</span> {f.suggestion}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>

        {/* ── 4. Redlines ── */}
        <CollapsibleCard title="Redlined version" count={redlines.length}>
          {redlines.length === 0 ? (
            <p className="text-sm text-navy/60">No rewrites suggested.</p>
          ) : (
            <>
              {/* Copy all redlines button */}
              {redlines.length > 1 && (
                <div className="mb-4 no-print">
                  <CopyButton
                    text={buildAllRedlinesText()}
                    label="Copy all redlines"
                    className="!text-sm !px-3 !py-2"
                  />
                </div>
              )}
              <div className="space-y-5">
                {redlines.map((r, i) => (
                  <div key={i} className="redline-card border border-navy/15 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-navy/10">
                      <div className="p-4 bg-danger/[0.04]">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-danger">Original</p>
                        <p className="mt-2 text-sm leading-relaxed line-through decoration-danger/50">{r.original}</p>
                      </div>
                      <div className="p-4 bg-emerald-50/60">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                            Suggested rewrite — verify with a lawyer
                          </p>
                          <CopyButton text={r.suggested} label="Copy" />
                        </div>
                        <p className="mt-2 text-sm leading-relaxed">{r.suggested}</p>
                      </div>
                    </div>
                    {r.reason && (
                      <p className="px-4 py-3 text-xs text-navy/65 border-t border-navy/10 bg-navy/[0.02]">
                        Why: {r.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CollapsibleCard>

        {/* ── 5. Role summary ── */}
        <CollapsibleCard
          title={isLawyer ? "Counsel's summary" : "Are you protected?"}
          defaultOpen
        >
          {roleSummary.protectedChecklist?.length > 0 && (
            <ul className="space-y-2">
              {roleSummary.protectedChecklist.map((item, i) => {
                const bad = item.trim().startsWith("✘") || item.trim().toLowerCase().startsWith("no");
                return (
                  <li key={i} className={`text-sm leading-relaxed flex gap-2 ${bad ? "text-danger" : ""}`}>
                    <span className="shrink-0">{bad ? "✘" : "✔"}</span>
                    <span>{item.replace(/^[✔✘]\s*/, "")}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {isLawyer && roleSummary.lawyerNotes && (
            <div className="mt-4 border-t border-navy/10 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-navy/50">Statutory & case-law notes</p>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{roleSummary.lawyerNotes}</p>
            </div>
          )}
          {!roleSummary.protectedChecklist?.length && !roleSummary.lawyerNotes && (
            <p className="text-sm text-navy/60">No summary available for this document.</p>
          )}
        </CollapsibleCard>

        {/* ── Proofing sweep (quiet, last) ── */}
        {proofingIssues.length > 0 && (
          <CollapsibleCard title="Drafting & proofing issues" count={proofingIssues.length}>
            <ul className="space-y-3">
              {proofingIssues.map((p, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold">{PROOFING_LABELS[p.type] || "Issue"}:</span>{" "}
                  {p.excerpt && <em className="text-navy/70">&ldquo;{p.excerpt}&rdquo;</em>} — {p.note}
                </li>
              ))}
            </ul>
          </CollapsibleCard>
        )}
      </div>

      {/* ── Disclaimer ── */}
      <p className="mt-8 text-xs text-navy/55 border border-navy/15 rounded-lg p-4">
        {disclaimer ||
          "This analysis is for informational purposes only and does not constitute legal advice. Please consult a qualified advocate."}
      </p>
    </div>
  );
}
