/**
 * legalKnowledge.js — the statutory "brain" of ContractSafe.
 *
 * Instead of dumping every Indian statute into every prompt, we model what a
 * good associate actually does: apply the law that is RELEVANT to the kind of
 * contract in front of them. This module holds:
 *
 *   • STATUTE_LIBRARY   — a catalogue of Indian statutes with the sections that
 *                         actually bite in contract review.
 *   • CONTRACT_PROFILES — per contract type: which statutes matter, which
 *                         clauses SHOULD exist (for missing-clause detection),
 *                         and the type-specific risk hotspots.
 *   • builders          — assemble a focused, contract-type-aware legal context
 *                         string for the prompt.
 *
 * Accuracy rule: every section number here is one we are confident about. The
 * prompt still instructs the model never to fabricate citations — this library
 * is guidance for WHAT to check, not a substitute for the model reading the
 * actual document.
 */

/* ════════════════════════════════════════════════════════════════════
 * Statute catalogue. Keyed by short code. `cite` is the canonical name the
 * model should use in complianceFlags.act.
 * ══════════════════════════════════════════════════════════════════ */
export const STATUTE_LIBRARY = {
  ICA: {
    cite: "Indian Contract Act, 1872",
    notes:
      "S.10 (essentials of a valid contract), S.11 (capacity — minor's contract is void), S.16 (undue influence), S.17 (fraud), S.23 (unlawful consideration/object — clause void if object is unlawful, immoral or opposed to public policy), S.27 (RESTRAINT OF TRADE — any agreement restraining a person from exercising a lawful profession/trade is VOID; post-employment non-competes are generally unenforceable in India — Niranjan Shankar Golikari, Percept D'Mark v. Zaheer Khan, Superintendence Co. v. Krishan Murgai), S.28 (clauses that wholly bar a party from enforcing rights in court or that curtail the limitation period are void — bona fide arbitration is the exception), S.56 (frustration / impossibility), S.73 (compensation for loss from breach — actual loss must be proved), S.74 (LIQUIDATED DAMAGES — a stipulated sum is recoverable only up to reasonable compensation; penalties masquerading as 'genuine pre-estimate' are struck down — Fateh Chand, ONGC v. Saw Pipes, Kailash Nath v. DDA), S.124-125 (indemnity), S.126-129 (guarantee).",
  },
  SRA: {
    cite: "Specific Relief Act, 1963",
    notes:
      "Post the 2018 amendment, specific performance is now the GENERAL RULE (S.10), not a discretionary remedy. S.14 lists contracts NOT specifically enforceable — notably those dependent on personal qualifications or requiring continuous court-supervised performance (e.g. personal service / employment cannot be specifically enforced). S.20 (substituted performance), S.41 (when injunctions are refused).",
  },
  LIMITATION: {
    cite: "Limitation Act, 1963",
    notes:
      "A suit for breach of contract must generally be filed within 3 years of the breach (Article 55) / Article 137 residuary. Parties CANNOT contractually extend the limitation period, and a clause shortening it (e.g. 'no claim after 30 days') is void under S.28 ICA. Flag any clause that purports to bar claims after a period shorter than statutory limitation.",
  },
  STAMP: {
    cite: "Indian Stamp Act, 1899 (read with State Stamp Acts)",
    notes:
      "Every instrument must bear stamp duty per the Schedule (and the relevant State amendment — duty varies by state). S.35: an unstamped or insufficiently stamped instrument is INADMISSIBLE in evidence and cannot be acted upon until the duty + penalty is paid. Always check whether the document recites adequate stamping / e-stamp particulars and whether the duty matches the instrument and state of execution.",
  },
  REGISTRATION: {
    cite: "Registration Act, 1908",
    notes:
      "S.17: registration is COMPULSORY for, inter alia, leases of immovable property from year to year or exceeding one year, gifts of immovable property, and instruments that create/extinguish any right in immovable property of value ₹100 or more. S.49: an unregistered document that requires registration cannot affect the immovable property or be received as evidence of the transaction (limited exceptions). Flag leases > 11 months and any property-interest instrument lacking registration.",
  },
  SOGA: {
    cite: "Sale of Goods Act, 1930",
    notes:
      "Governs sale/supply of goods. S.12 (conditions vs warranties), S.14 (implied condition as to title), S.15 (sale by description), S.16 (implied conditions of merchantable quality & fitness for purpose; caveat emptor with exceptions), S.26 (risk passes with property unless agreed otherwise), S.39 (delivery & instalments). Check that exclusion-of-warranty clauses are not unconscionable and that title/risk/acceptance are clearly allocated.",
  },
  MSMED: {
    cite: "Micro, Small and Medium Enterprises Development Act, 2006",
    notes:
      "If the supplier/service provider is a registered Micro or Small Enterprise, the buyer MUST pay within the agreed date or, absent agreement, within 15 days — and in NO case beyond 45 days from acceptance (S.15). Delay attracts compound interest at 3× the RBI bank rate (S.16), which is not tax-deductible for the buyer. A payment term longer than 45 days is unenforceable to that extent. Flag any net-60/net-90 or 'pay when paid' terms.",
  },
  NI: {
    cite: "Negotiable Instruments Act, 1881",
    notes:
      "S.138: dishonour of a cheque for insufficiency of funds is a criminal offence (up to 2 years' imprisonment and/or fine up to twice the cheque amount), subject to the 30-day demand notice and 15-day cure window. Relevant wherever payment or security is by cheque / post-dated cheques. Note S.143A interim compensation.",
  },
  ARBITRATION: {
    cite: "Arbitration and Conciliation Act, 1996",
    notes:
      "S.7 (what makes a valid arbitration agreement), S.11 (appointment — a clause letting ONE party unilaterally appoint the sole arbitrator is invalid: TRF Ltd v. Energo, Perkins Eastman v. HSCC, and CORE v. ECI on curated panels), S.12 + Fifth/Seventh Schedule (independence/impartiality), S.16 (kompetenz-kompetenz), S.29A (award within 12 months of pleadings, extendable 6 months), S.34 (narrow grounds to set aside). Distinguish SEAT (governs the supervisory court) from VENUE (mere location) — BGS SGS Soma. Flag unilateral-appointment and one-sided dispute clauses.",
  },
  IT: {
    cite: "Information Technology Act, 2000",
    notes:
      "S.10A (electronic contracts are valid and enforceable), S.43A + SPDI Rules 2011 (a body corporate handling sensitive personal data must maintain 'reasonable security practices' or pay compensation — now largely overtaken by the DPDP Act), S.72A (criminal liability for disclosing personal information obtained under a contract, in breach of that contract), S.66/66C/66D (hacking, identity theft, cheating by personation). For e-signatures check S.5 read with the IT Act Schedules.",
  },
  DPDP: {
    cite: "Digital Personal Data Protection Act, 2023",
    notes:
      "India's data-protection statute. S.5 (itemised notice), S.6 (free, specific, informed, unambiguous consent — blanket 'any purpose the Company deems fit' consent is INVALID; purpose limitation applies), S.8 (Data Fiduciary obligations incl. security safeguards and breach notification to the Board and affected principals), S.8(2)-(3) (a Data Processor may act only under a valid CONTRACT — so processing/sub-processing clauses are mandatory), S.11-14 (data principal rights: access, correction, erasure, grievance, nomination), S.16 (cross-border transfer permitted except to countries the Central Government restricts). Penalties up to ₹250 crore (Schedule). Flag over-broad consent, indefinite retention, unrestricted overseas transfer and missing processor terms.",
  },
  COPYRIGHT: {
    cite: "Copyright Act, 1957",
    notes:
      "S.17 (first ownership: the employer owns work made by an employee in the course of a 'contract of service', but an independent contractor/'contract for service' RETAINS copyright unless validly assigned — so freelance/agency work needs an express written assignment). S.18-19 (an assignment MUST be in writing and signed; S.19(3) specify rights, duration & territory; S.19(4) assignment lapses if the right is not exercised within 1 year; S.19(5) default term is 5 years if unspecified; S.19(6) default territory is India). S.57 (moral rights — a blanket waiver of moral rights is of doubtful enforceability). Check IP-vesting clauses for these formalities.",
  },
  IPR_OTHER: {
    cite: "Trade Marks Act, 1999 / Patents Act, 1970 / Designs Act, 2000",
    notes:
      "For non-copyright IP: trademark assignments/licences should be recorded with the Registry (registered-user agreements), patent assignments must be in writing and registered (S.68 Patents Act), and design assignments registered (S.30 Designs Act). Confidential know-how/trade secrets are protected only by contract + common law in India (no dedicated statute) — so confidentiality and non-disclosure drafting carries the full weight.",
  },
  COMPANIES: {
    cite: "Companies Act, 2013",
    notes:
      "Check authority to bind the company: S.179 (powers exercised by the Board), S.180 (acts needing shareholders' special resolution, e.g. borrowing beyond paid-up capital + free reserves, disposing of an undertaking), S.188 (RELATED PARTY TRANSACTIONS — contracts with directors/related parties need Board and, beyond thresholds, shareholder approval and must be at arm's length), and whether the signatory is authorised (board resolution / power of attorney). Flag missing authorisation recitals and potential RPTs.",
  },
  COMPETITION: {
    cite: "Competition Act, 2002",
    notes:
      "S.3 voids agreements causing an appreciable adverse effect on competition — watch exclusive supply/distribution, tie-in arrangements, resale price maintenance, and overly broad exclusivity/non-compete (a non-compete is permissible only if reasonable and ancillary, e.g. on sale of a business under the S.27 ICA exception / proviso). S.4 (abuse of dominant position). Flag long exclusivity, RPM and most-favoured-nation clauses for a competition look.",
  },
  CONSUMER: {
    cite: "Consumer Protection Act, 2019",
    notes:
      "Where a party is a consumer (B2C), S.2(46) lets courts strike 'unfair contract terms' — e.g. excessive security deposits, disproportionate penalties, unilateral termination/variation rights, clauses that shift an unreasonable burden or exclude liability for the supplier. The E-Commerce Rules 2020 add disclosure and grievance-redressal duties. Flag one-sided consumer-facing terms.",
  },
  FEMA: {
    cite: "Foreign Exchange Management Act, 1999 (with RBI regulations)",
    notes:
      "Engaged whenever a party is non-resident or payment is in foreign currency: cross-border consideration must comply with FEMA (current/capital account rules, FDI pricing guidelines, export-of-service realisation timelines, ODI/Overseas Direct Investment). Royalty/technical-fee and share-transfer pricing have specific RBI conditions. Flag forex payment, foreign-party and indemnity-in-foreign-currency clauses for FEMA review.",
  },
  GST: {
    cite: "Central Goods and Services Tax Act, 2017",
    notes:
      "Tax clauses should state whether prices are inclusive/exclusive of GST, who bears the tax, and require a valid tax invoice (so the buyer can claim input tax credit). Watch reverse-charge (RCM) liability on imports of service and supplies from unregistered persons, correct place-of-supply, and TDS/TCS under GST. Flag silent or ambiguous tax-allocation clauses and missing invoicing obligations.",
  },
  TPA: {
    cite: "Transfer of Property Act, 1882",
    notes:
      "For leases/licences of immovable property: S.105 (lease defined), S.106 (in absence of contract, the notice period / term defaults — e.g. month-to-month tenancies), S.107 (a lease exceeding one year must be made by a REGISTERED instrument), S.108 (rights & liabilities of lessor and lessee). Read with the Registration Act and the relevant State Rent Control law.",
  },
  LABOUR_CODES: {
    cite: "Labour Codes 2019-2020 (and predecessor Acts still in force)",
    notes:
      "India is mid-transition. The four Codes — Code on Wages 2019, Industrial Relations Code 2020, Code on Social Security 2020, Occupational Safety, Health and Working Conditions Code 2020 — are enacted but being rolled out state-by-state, so the PREDECESSOR Acts still apply where the Codes/rules are not yet notified: Payment of Wages Act 1936, Minimum Wages Act 1948, Payment of Bonus Act 1965 (→ Code on Wages); Industrial Disputes Act 1947 incl. retrenchment/notice (→ IR Code); EPF Act 1952, ESI Act 1948, Payment of Gratuity Act 1972 (gratuity after 5 years' service), Maternity Benefit Act 1961 (26 weeks' paid leave) (→ Social Security Code); Factories Act 1948 & State Shops & Establishments Acts on hours/leave/termination notice (→ OSH Code). Check statutory minimum wage, timely payment, PF/ESI eligibility, gratuity, maternity benefit and lawful notice/retrenchment.",
  },
  POSH: {
    cite: "Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013",
    notes:
      "Mandatory for any workplace with 10 or more employees: a written anti-harassment policy and a constituted Internal Committee (IC). An employment contract / handbook should reference the POSH policy and the IC complaint mechanism. Flag its absence in employment documents.",
  },
  RENAMED_2024: {
    cite: "Bharatiya Nyaya Sanhita 2023 / Bharatiya Nagarik Suraksha Sanhita 2023 / Bharatiya Sakshya Adhiniyam 2023",
    notes:
      "From 1 July 2024 these replaced the Indian Penal Code 1860, the Code of Criminal Procedure 1973 and the Indian Evidence Act 1872 respectively. If the contract still cites 'IPC', 'CrPC' or the 'Indian Evidence Act' (e.g. in fraud, indemnity or evidence clauses), note that the reference is to a REPEALED statute and should be updated. Admissibility of electronic records is now under S.63 BSA (the old S.65B Evidence Act).",
  },
};

/* Always-relevant statutes — the spine of any Indian contract review. */
const CORE_STATUTE_KEYS = ["ICA", "SRA", "LIMITATION", "STAMP"];

/* ════════════════════════════════════════════════════════════════════
 * Per-contract-type profiles: relevant statutes, clauses that SHOULD be
 * present (drives missing-clause detection), and type-specific hotspots.
 * ══════════════════════════════════════════════════════════════════ */
export const CONTRACT_PROFILES = {
  NDA: {
    statuteKeys: ["DPDP", "IT", "COPYRIGHT", "IPR_OTHER", "ARBITRATION"],
    expectedClauses: [
      "Clear definition of 'Confidential Information'",
      "Standard exclusions (public domain, independently developed, rightfully received, required by law)",
      "Permitted purpose / use restriction",
      "Permitted disclosees (employees/advisers on a need-to-know basis, bound by equivalent terms)",
      "Term of the NDA and survival period of the confidentiality obligation",
      "Return or certified destruction of confidential material on termination",
      "Remedies including the right to seek injunctive relief",
      "No grant of licence / no IP transfer by disclosure",
      "Governing law and dispute resolution",
    ],
    hotspots:
      "Perpetual/indefinite confidentiality with no carve-outs; one-sided (only one party bound); missing standard exclusions; over-broad definition capturing public information; no injunctive-relief remedy; residual-knowledge clauses that gut the NDA.",
  },
  Employment: {
    statuteKeys: ["LABOUR_CODES", "POSH", "COPYRIGHT", "DPDP", "COMPETITION", "ARBITRATION", "NI"],
    expectedClauses: [
      "Job title, duties and reporting line",
      "Compensation, components and lawful deductions only",
      "Working hours, leave and holidays",
      "Probation terms and confirmation",
      "Notice period — symmetric for both parties",
      "Statutory benefits: PF, ESI (if eligible), gratuity, maternity benefit",
      "Reference to the POSH policy and Internal Committee",
      "Confidentiality and a reasonable (not perpetual) survival period",
      "IP assignment for work created in the course of employment",
      "Non-solicitation (note: post-employment non-compete is generally void under S.27 ICA)",
      "Grounds and process for termination; full & final settlement",
      "Governing law and dispute resolution",
    ],
    hotspots:
      "Post-employment non-compete (S.27 ICA — generally VOID); penal liquidated damages (S.74); asymmetric notice (employer can fire instantly, employee must give 90 days); forfeiture of earned wages/variable pay; unilateral right to vary terms; over-broad biometric/personal-data consent (DPDP); perpetual confidentiality; specific-performance of personal service (barred by S.14 SRA); unilateral arbitrator appointment.",
  },
  SaaS: {
    statuteKeys: ["DPDP", "IT", "CONSUMER", "GST", "COMPANIES", "ARBITRATION", "COPYRIGHT", "FEMA"],
    expectedClauses: [
      "Scope of the subscription / licence grant and usage limits",
      "Service levels (uptime SLA), support and remedies/credits",
      "Fees, billing, taxes (GST) and renewal / auto-renewal terms",
      "Data protection, security safeguards and breach notification (DPDP)",
      "Customer data ownership and export/return on termination",
      "Limitation of liability with a stated cap",
      "IP-infringement indemnity in the customer's favour",
      "Warranties and disclaimers",
      "Suspension and termination rights, and effect of termination",
      "Sub-processors / sub-contracting and confidentiality",
      "Governing law and dispute resolution",
    ],
    hotspots:
      "Unlimited or unilateral liability exclusion; auto-renewal with a long opt-out window; vendor owns/uses customer data; no data-return on exit; over-broad data-transfer consent (DPDP); price-increase at sole discretion; GST/tax allocation silent; unilateral suspension; foreign vendor without FEMA-compliant payment terms.",
  },
  Vendor: {
    statuteKeys: ["SOGA", "MSMED", "GST", "NI", "COMPANIES", "CONSUMER", "ARBITRATION", "FEMA", "COMPETITION"],
    expectedClauses: [
      "Scope / specifications of goods or services",
      "Delivery schedule, acceptance criteria and rejection rights",
      "Price, taxes (GST) and a valid tax-invoice obligation",
      "Payment terms (mind the MSMED 45-day cap) and interest on delay",
      "Warranties (Sale of Goods) and remedies for defects",
      "Title and risk passing",
      "Limitation of liability and indemnity",
      "Insurance (where appropriate)",
      "Force majeure",
      "Termination (cause and convenience) and consequences",
      "Anti-bribery / compliance and confidentiality",
      "Governing law and dispute resolution",
    ],
    hotspots:
      "Payment terms beyond 45 days where the supplier is MSME-registered (MSMED Act); GST/tax burden left ambiguous; no acceptance/rejection mechanism; one-sided indemnity; uncapped liability; 'pay when paid'; exclusivity that risks Competition Act S.3; security cheques engaging NI Act S.138; foreign supplier and FEMA.",
  },
  Freelance: {
    statuteKeys: ["COPYRIGHT", "MSMED", "GST", "DPDP", "IT", "ARBITRATION", "IPR_OTHER"],
    expectedClauses: [
      "Scope of work / deliverables and acceptance",
      "Milestones, timelines and revision limits",
      "Fees and a clear payment schedule (mind MSMED if registered)",
      "TDS / GST treatment of fees",
      "Express written IP assignment on full payment (S.18-19 Copyright Act)",
      "Confidentiality",
      "Independent-contractor status (no employer-employee relationship)",
      "Termination / kill-fee and payment for work done",
      "Limitation of liability",
      "Governing law and dispute resolution",
    ],
    hotspots:
      "IP 'vests automatically' without a written, signed assignment (S.18-19 Copyright Act — assignment may fail); IP transfer before payment; no kill-fee so cancellation means no pay; misclassification creating a deemed employment relationship; payment beyond 45 days (MSMED); unlimited revisions / scope creep; TDS/GST silent; broad indemnity from an individual.",
  },
  Other: {
    statuteKeys: ["DPDP", "IT", "GST", "COMPANIES", "ARBITRATION", "NI", "COMPETITION", "FEMA"],
    expectedClauses: [
      "Clear parties and recitals (with authority to contract)",
      "Definitions",
      "Term and renewal",
      "Each party's obligations / scope",
      "Payment / consideration and taxes",
      "Confidentiality",
      "Intellectual property ownership",
      "Limitation of liability and indemnity",
      "Warranties and representations",
      "Force majeure",
      "Termination and its consequences",
      "Governing law and dispute resolution",
      "Notices, assignment and boilerplate (severability, waiver, entire agreement)",
    ],
    hotspots:
      "Uncapped liability; one-sided indemnity; missing or vague termination/dispute clauses; over-broad data consent (DPDP); ambiguous tax allocation; signatory authority not recited.",
  },
};

/* ════════════════════════════════════════════════════════════════════
 * Builders — assemble focused prompt fragments.
 * ══════════════════════════════════════════════════════════════════ */

function statuteBlock(keys) {
  // De-dupe while preserving order: core first, then type-specific.
  const seen = new Set();
  const ordered = [...CORE_STATUTE_KEYS, ...keys, "REGISTRATION", "RENAMED_2024"].filter((k) => {
    if (seen.has(k) || !STATUTE_LIBRARY[k]) return false;
    seen.add(k);
    return true;
  });
  return ordered
    .map((k, i) => `${i + 1}. ${STATUTE_LIBRARY[k].cite} — ${STATUTE_LIBRARY[k].notes}`)
    .join("\n");
}

function jurisdictionNote(jurisdiction) {
  if (jurisdiction === "GDPR") {
    return "\n\nDATA-PROTECTION LENS: The user selected GDPR. Apply the EU GDPR alongside Indian law — lawful basis (Art. 6), data-subject rights (Arts. 15-22), Art. 28 processor agreements, and Chapter V restrictions on international transfers (SCCs / adequacy). Where Indian and EU positions differ, note both.";
  }
  if (jurisdiction === "Both") {
    return "\n\nDATA-PROTECTION LENS: The user selected BOTH Indian law and GDPR. Cross-check data clauses against the DPDP Act 2023 AND the EU GDPR (lawful basis, data-subject rights, Art. 28 processor terms, Chapter V transfer safeguards), flagging where the two regimes diverge.";
  }
  return "";
}

/**
 * The full, contract-type-aware statutory context injected into prompts.
 */
export function buildLegalContext({ contractType, jurisdiction }) {
  const profile = CONTRACT_PROFILES[contractType] || CONTRACT_PROFILES.Other;
  return `STATUTES TO ACTIVELY CHECK AGAINST (cite the act + section in "complianceFlags" whenever a clause conflicts; these are selected because they bear on a ${contractType} contract — also apply any other Indian statute you recognise as relevant):
${statuteBlock(profile.statuteKeys)}

STAMP DUTY & REGISTRATION: Always assess whether the document appears adequately stamped for its type and state of execution (Indian Stamp Act / State Stamp Act — unstamped instruments are inadmissible under S.35) and whether it requires registration (Registration Act 1908 — e.g. leases over one year). Raise these as complianceFlags if the document is silent or deficient.${jurisdictionNote(jurisdiction)}`;
}

/**
 * The clauses a well-drafted contract of this type SHOULD contain — used to
 * drive missing-clause / omission detection (a core associate skill).
 */
export function buildExpectedClauses(contractType) {
  const profile = CONTRACT_PROFILES[contractType] || CONTRACT_PROFILES.Other;
  return profile.expectedClauses.map((c) => `- ${c}`).join("\n");
}

/**
 * Type-specific risk hotspots — primes the danger-zone / clause analysis.
 */
export function buildHotspots(contractType) {
  const profile = CONTRACT_PROFILES[contractType] || CONTRACT_PROFILES.Other;
  return profile.hotspots;
}
