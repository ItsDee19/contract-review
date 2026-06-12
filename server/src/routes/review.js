import { Router } from "express";
import { buildPrompt, DISCLAIMER } from "../lib/prompt.js";
import { analyzeContract } from "../lib/gemini.js";

const router = Router();

const MAX_CHARS = 500_000;
const VALID_TYPES = ["NDA", "Employment", "SaaS", "Vendor", "Freelance", "Other"];
const VALID_JURISDICTIONS = ["Indian Law", "GDPR", "Both", "Other"];
const VALID_ROLES = ["Lawyer", "Founder", "HR Manager", "Freelancer"];

router.post("/", async (req, res, next) => {
  try {
    const { contractText, contractType, jurisdiction, userRole } = req.body || {};

    // ── Validation ────────────────────────────────────────────────
    if (!contractText || typeof contractText !== "string" || !contractText.trim()) {
      return res.status(400).json({
        error: "No contract text received. Upload a PDF or paste the contract text first.",
      });
    }
    if (contractText.length > MAX_CHARS) {
      return res.status(413).json({
        error: `Contract is too long (${contractText.length.toLocaleString()} characters). The limit is ${MAX_CHARS.toLocaleString()} characters — try reviewing it in parts.`,
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

    // ── Build prompt & call Gemini ────────────────────────────────
    const fullPrompt = buildPrompt({
      contractText: contractText.trim(),
      contractType: type,
      jurisdiction: juri,
      userRole: role,
    });

    const parsed = await analyzeContract(fullPrompt);

    // ── Normalise so the frontend can always render safely ───────
    const safe = {
      dangerZones: Array.isArray(parsed.dangerZones) ? parsed.dangerZones : [],
      clauseReview: Array.isArray(parsed.clauseReview) ? parsed.clauseReview : [],
      complianceFlags: Array.isArray(parsed.complianceFlags) ? parsed.complianceFlags : [],
      redlines: Array.isArray(parsed.redlines) ? parsed.redlines : [],
      roleSummary: {
        headline: parsed.roleSummary?.headline || "Analysis complete.",
        protectedChecklist: Array.isArray(parsed.roleSummary?.protectedChecklist)
          ? parsed.roleSummary.protectedChecklist
          : [],
        lawyerNotes: parsed.roleSummary?.lawyerNotes || "",
      },
      proofingIssues: Array.isArray(parsed.proofingIssues) ? parsed.proofingIssues : [],
      disclaimer: DISCLAIMER,
      meta: { contractType: type, jurisdiction: juri, userRole: role, analyzedAt: new Date().toISOString() },
    };

    res.json(safe);
  } catch (err) {
    next(err);
  }
});

export default router;
