import { useMemo } from "react";
import { CollapsibleCard, SeverityBadge, RiskScore, riskTone } from "./ReportBits.jsx";

const PROOFING_LABELS = {
  vague_language: "Vague language",
  broken_ref: "Broken cross-reference",
  inconsistency: "Inconsistency",
  shall_misuse: "Shall / may misuse",
  undefined_term: "Undefined term",
};

/* ── Phase progress indicator ──────────────────────────────────── */
const PHASES = [
  { id: 1, label: "Danger zones & verdict", icon: "🛡️" },
  { id: 2, label: "Clause review & compliance", icon: "📋" },
  { id: 3, label: "Redlines & proofing", icon: "✏️" },
];

function PhaseTracker({ currentPhase, done }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {PHASES.map((p, i) => {
        const phaseNum = currentPhase?.phase || 0;
        const isActive = phaseNum === p.id && !done;
        const isComplete = phaseNum > p.id || done;

        return (
          <div key={p.id} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && (
              <div
                className={`hidden sm:block w-6 h-px transition-colors duration-500 ${
                  isComplete ? "bg-emerald-500" : "bg-navy/15"
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium rounded-full px-2.5 sm:px-3 py-1.5 transition-all duration-500 ${
                isActive
                  ? "bg-navy text-white shadow-md shadow-navy/20"
                  : isComplete
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-navy/5 text-navy/40"
              }`}
            >
              {isComplete ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : isActive ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="text-xs">{p.icon}</span>
              )}
              <span className="hidden sm:inline">{p.label}</span>
              <span className="sm:hidden">P{p.id}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Animated section wrapper ──────────────────────────────────── */
function FadeIn({ children, show }) {
  if (!show) return null;
  return (
    <div
      className="animate-fadeIn"
      style={{
        animation: "fadeSlideIn 0.5s ease-out forwards",
      }}
    >
      {children}
    </div>
  );
}

/**
 * StreamingResults — renders the report progressively as SSE sections arrive.
 *
 * Props:
 *   sections      — { dangerZones?, roleSummary?, clauseReview?, ... }
 *   currentPhase  — { phase: 1|2|3, label: string } | null
 *   done          — boolean
 *   meta          — { contractType, jurisdiction, userRole }
 *   error         — string | null
 *   onViewFullReport — callback when user wants the static Results page
 *   onCancel      — callback to abort and go back
 */
export default function StreamingResults({
  sections,
  currentPhase,
  done,
  meta,
  error,
  onViewFullReport,
  onCancel,
}) {
  const {
    dangerZones,
    roleSummary,
    clauseReview,
    complianceFlags,
    redlines,
    proofingIssues,
  } = sections;

  const isLawyer = meta?.userRole === "Lawyer";

  const highCount = useMemo(
    () => (clauseReview || []).filter((c) => Number(c.riskScore) >= 7).length,
    [clauseReview]
  );

  const sectionCount = Object.keys(sections).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* ── Sticky progress bar ── */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-navy/10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6">
        <div className="flex items-center justify-between gap-4">
          <PhaseTracker currentPhase={currentPhase} done={done} />
          <div className="flex items-center gap-2 shrink-0">
            {done && (
              <button onClick={onViewFullReport} className="btn-primary !py-2 !px-4 text-sm">
                View full report →
              </button>
            )}
            {!done && (
              <button
                onClick={onCancel}
                className="text-xs text-navy/50 hover:text-navy font-medium px-2 py-1"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        {/* Live status text */}
        {currentPhase && !done && (
          <p className="mt-2 text-sm text-navy/60 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-navy rounded-full animate-pulse" />
            {currentPhase.label}
          </p>
        )}
        {done && (
          <p className="mt-2 text-sm text-emerald-600 font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Analysis complete — all sections ready
          </p>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div role="alert" className="mb-6 border border-danger/40 bg-danger/5 text-danger rounded-md px-4 py-3 text-sm">
          {error}
          <button onClick={onCancel} className="ml-3 underline font-semibold">
            Go back
          </button>
        </div>
      )}

      {/* ── Header (appears when roleSummary arrives) ── */}
      <FadeIn show={!!roleSummary}>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/50">
            Contract report · {meta?.contractType || "Contract"} · {meta?.jurisdiction || "Indian Law"} · For a {meta?.userRole || "reader"}
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-snug max-w-2xl">
            {roleSummary?.headline || "Analyzing…"}
          </h1>
        </div>
      </FadeIn>

      {/* ── Stat strip (builds progressively) ── */}
      {sectionCount > 0 && (
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 border border-navy/15 rounded-lg divide-x divide-y sm:divide-y-0 divide-navy/10 overflow-hidden text-center">
          <StatCell
            n={dangerZones?.length}
            label="Danger zones"
            tone={dangerZones?.length ? "text-danger" : ""}
          />
          <StatCell
            n={clauseReview ? highCount : undefined}
            label="High-risk clauses"
            tone={highCount ? "text-danger" : ""}
          />
          <StatCell
            n={complianceFlags?.length}
            label="Compliance flags"
            tone={complianceFlags?.length ? "text-amber-600" : ""}
          />
          <StatCell
            n={proofingIssues?.length}
            label="Drafting issues"
            tone=""
          />
        </div>
      )}

      <div className="space-y-4">
        {/* ── 1. Danger zones ── */}
        <FadeIn show={!!dangerZones}>
          <CollapsibleCard title="Danger zones" count={dangerZones?.length} accent="danger" defaultOpen>
            {!dangerZones?.length ? (
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
        </FadeIn>

        {/* ── 5. Role summary (arrives with phase 1) ── */}
        <FadeIn show={!!roleSummary}>
          <CollapsibleCard
            title={isLawyer ? "Counsel's summary" : "Are you protected?"}
            defaultOpen
          >
            {roleSummary?.protectedChecklist?.length > 0 && (
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
            {isLawyer && roleSummary?.lawyerNotes && (
              <div className="mt-4 border-t border-navy/10 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-navy/50">Statutory & case-law notes</p>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{roleSummary.lawyerNotes}</p>
              </div>
            )}
            {!roleSummary?.protectedChecklist?.length && !roleSummary?.lawyerNotes && (
              <p className="text-sm text-navy/60">No summary available for this document.</p>
            )}
          </CollapsibleCard>
        </FadeIn>

        {/* ── Phase 2 loading skeleton ── */}
        {!clauseReview && currentPhase?.phase >= 2 && !done && (
          <SkeletonCard label="Analyzing every clause…" />
        )}

        {/* ── 2. Clause by clause ── */}
        <FadeIn show={!!clauseReview}>
          <CollapsibleCard title="Clause-by-clause review" count={clauseReview?.length}>
            {!clauseReview?.length ? (
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
        </FadeIn>

        {/* ── 3. Indian law compliance ── */}
        <FadeIn show={!!complianceFlags}>
          <CollapsibleCard title="Indian law compliance" count={complianceFlags?.length}>
            {!complianceFlags?.length ? (
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
        </FadeIn>

        {/* ── Phase 3 loading skeleton ── */}
        {!redlines && currentPhase?.phase >= 3 && !done && (
          <SkeletonCard label="Writing suggested rewrites…" />
        )}

        {/* ── 4. Redlines ── */}
        <FadeIn show={!!redlines}>
          <CollapsibleCard title="Redlined version" count={redlines?.length}>
            {!redlines?.length ? (
              <p className="text-sm text-navy/60">No rewrites suggested.</p>
            ) : (
              <div className="space-y-5">
                {redlines.map((r, i) => (
                  <div key={i} className="redline-card border border-navy/15 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-navy/10">
                      <div className="p-4 bg-danger/[0.04]">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-danger">Original</p>
                        <p className="mt-2 text-sm leading-relaxed line-through decoration-danger/50">{r.original}</p>
                      </div>
                      <div className="p-4 bg-emerald-50/60">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                          Suggested rewrite — verify with a lawyer
                        </p>
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
            )}
          </CollapsibleCard>
        </FadeIn>

        {/* ── 6. Proofing issues ── */}
        <FadeIn show={proofingIssues?.length > 0}>
          <CollapsibleCard title="Drafting & proofing issues" count={proofingIssues?.length}>
            <ul className="space-y-3">
              {(proofingIssues || []).map((p, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold">{PROOFING_LABELS[p.type] || "Issue"}:</span>{" "}
                  {p.excerpt && <em className="text-navy/70">&ldquo;{p.excerpt}&rdquo;</em>} — {p.note}
                </li>
              ))}
            </ul>
          </CollapsibleCard>
        </FadeIn>
      </div>

      {/* ── Waiting for first results ── */}
      {sectionCount === 0 && !error && (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-3 bg-navy/5 rounded-full px-5 py-3">
            <span className="inline-block w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
            <span className="text-sm font-medium text-navy/70">
              {currentPhase?.label || "Connecting to AI…"}
            </span>
          </div>
          <p className="mt-4 text-xs text-navy/50">
            Sections will appear here as they&apos;re ready — no need to wait for the full report.
          </p>
        </div>
      )}

      {/* ── Disclaimer (shows when done) ── */}
      {done && (
        <p className="mt-8 text-xs text-navy/55 border border-navy/15 rounded-lg p-4">
          This analysis is for informational purposes only and does not constitute legal advice. Please consult a qualified advocate.
        </p>
      )}

      {/* ── Inline keyframes for fade animation ── */}
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/* ── Stat cell with loading state ──────────────────────────────── */
function StatCell({ n, label, tone }) {
  return (
    <div className="px-3 py-4">
      {n !== undefined ? (
        <p className={`text-2xl font-extrabold ${tone || "text-navy"}`}>{n}</p>
      ) : (
        <div className="h-8 flex items-center justify-center">
          <div className="w-6 h-3 bg-navy/10 rounded animate-pulse" />
        </div>
      )}
      <p className="text-xs text-navy/55 mt-0.5">{label}</p>
    </div>
  );
}

/* ── Skeleton loading card ─────────────────────────────────────── */
function SkeletonCard({ label }) {
  return (
    <div className="border border-navy/10 rounded-lg p-5">
      <div className="flex items-center gap-3">
        <span className="inline-block w-4 h-4 border-2 border-navy/20 border-t-navy/60 rounded-full animate-spin" />
        <span className="text-sm font-medium text-navy/60">{label}</span>
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-3 bg-navy/5 rounded-full w-full animate-pulse" />
        <div className="h-3 bg-navy/5 rounded-full w-4/5 animate-pulse" />
        <div className="h-3 bg-navy/5 rounded-full w-3/5 animate-pulse" />
      </div>
    </div>
  );
}
