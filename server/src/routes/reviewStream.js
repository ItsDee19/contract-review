import { Router } from "express";
import {
  DISCLAIMER,
  buildPhase1Prompt,
  buildPhase2Prompt,
  buildPhase3Prompt,
} from "../lib/prompt.js";
import { analyzeSection } from "../lib/gemini.js";

const router = Router();

const MAX_CHARS = 500_000;
const VALID_TYPES = ["NDA", "Employment", "SaaS", "Vendor", "Freelance", "Other"];
const VALID_JURISDICTIONS = ["Indian Law", "GDPR", "Both", "Other"];
const VALID_ROLES = ["Lawyer", "Founder", "HR Manager", "Freelancer"];

/**
 * SSE streaming review endpoint.
 *
 * Sends events:
 *   { type: "phase",   phase: 1|2|3, label: "..." }          — phase starting
 *   { type: "section", name: "dangerZones", data: [...] }     — section ready
 *   { type: "done",    meta: {...} }                           — all complete
 *   { type: "error",   message: "..." }                       — something broke
 */
router.post("/", async (req, res) => {
  const { contractText, contractType, jurisdiction, userRole } = req.body || {};

  // ── Validation (same as non-streaming route) ───────────────────
  if (!contractText || typeof contractText !== "string" || !contractText.trim()) {
    return res.status(400).json({
      error: "No contract text received. Upload a PDF or paste the contract text first.",
    });
  }
  if (contractText.length > MAX_CHARS) {
    return res.status(413).json({
      error: `Contract is too long (${contractText.length.toLocaleString()} characters). The limit is ${MAX_CHARS.toLocaleString()} characters.`,
    });
  }
  if (contractText.trim().length < 100) {
    return res.status(400).json({
      error: "That text is too short to be a contract. Paste the full agreement (at least a few clauses).",
    });
  }

  const type = VALID_TYPES.includes(contractType) ? contractType : "Other";
  const juri = VALID_JURISDICTIONS.includes(jurisdiction) ? jurisdiction : "Indian Law";
  const role = VALID_ROLES.includes(userRole) ? userRole : "Founder";

  const ctx = {
    contractText: contractText.trim(),
    contractType: type,
    jurisdiction: juri,
    userRole: role,
  };

  // ── Set up SSE ────────────────────────────────────────────────
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering if proxied
  });

  // Keep-alive to prevent proxy timeouts
  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15_000);

  function send(obj) {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  }

  let closed = false;
  req.on("close", () => {
    closed = true;
    clearInterval(keepAlive);
  });

  // ── Phase definitions ──────────────────────────────────────────
  const phases = [
    {
      id: 1,
      label: "Building the briefing: snapshot, verdict, dangers & gaps…",
      build: buildPhase1Prompt,
      keys: ["dealSummary", "overallRisk", "roleSummary", "dangerZones", "missingClauses"],
      normalise: (parsed) => ({
        dealSummary: {
          parties: Array.isArray(parsed.dealSummary?.parties) ? parsed.dealSummary.parties : [],
          snapshot: Array.isArray(parsed.dealSummary?.snapshot) ? parsed.dealSummary.snapshot : [],
        },
        overallRisk: {
          score: Number.isFinite(Number(parsed.overallRisk?.score))
            ? Math.min(100, Math.max(0, Number(parsed.overallRisk.score)))
            : null,
          verdict: parsed.overallRisk?.verdict || "Needs review",
          rationale: parsed.overallRisk?.rationale || "",
        },
        roleSummary: {
          headline: parsed.roleSummary?.headline || "Analysis complete.",
          protectedChecklist: Array.isArray(parsed.roleSummary?.protectedChecklist)
            ? parsed.roleSummary.protectedChecklist
            : [],
          lawyerNotes: parsed.roleSummary?.lawyerNotes || "",
        },
        dangerZones: Array.isArray(parsed.dangerZones) ? parsed.dangerZones : [],
        missingClauses: Array.isArray(parsed.missingClauses) ? parsed.missingClauses : [],
      }),
    },
    {
      id: 2,
      label: "Reviewing every clause against the statutes…",
      build: buildPhase2Prompt,
      keys: ["clauseReview", "complianceFlags"],
      normalise: (parsed) => ({
        clauseReview: Array.isArray(parsed.clauseReview) ? parsed.clauseReview : [],
        complianceFlags: Array.isArray(parsed.complianceFlags) ? parsed.complianceFlags : [],
      }),
    },
    {
      id: 3,
      label: "Drafting the action plan: redlines, negotiation & obligations…",
      build: buildPhase3Prompt,
      keys: ["redlines", "negotiationPlaybook", "obligations", "proofingIssues"],
      normalise: (parsed) => ({
        redlines: Array.isArray(parsed.redlines) ? parsed.redlines : [],
        negotiationPlaybook: Array.isArray(parsed.negotiationPlaybook) ? parsed.negotiationPlaybook : [],
        obligations: Array.isArray(parsed.obligations) ? parsed.obligations : [],
        proofingIssues: Array.isArray(parsed.proofingIssues) ? parsed.proofingIssues : [],
      }),
    },
  ];

  try {
    for (const phase of phases) {
      if (closed) break;

      // Notify: phase starting
      send({ type: "phase", phase: phase.id, label: phase.label });

      const prompt = phase.build(ctx);
      const parsed = await analyzeSection(prompt);
      const safe = phase.normalise(parsed);

      if (closed) break;

      // Send each section within this phase
      for (const key of phase.keys) {
        send({ type: "section", name: key, data: safe[key] });
      }
    }

    if (!closed) {
      send({
        type: "done",
        meta: {
          contractType: type,
          jurisdiction: juri,
          userRole: role,
          analyzedAt: new Date().toISOString(),
        },
        disclaimer: DISCLAIMER,
      });
    }
  } catch (err) {
    console.error("[stream] Phase failed:", err.message);
    if (!closed) {
      send({
        type: "error",
        message: err.publicMessage || "Something went wrong. Please try again.",
      });
    }
  } finally {
    clearInterval(keepAlive);
    if (!closed) res.end();
  }
});

export default router;
