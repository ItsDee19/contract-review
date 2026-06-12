import { Link, useNavigate } from "react-router-dom";

const ROLES = [
  {
    role: "Lawyer",
    line: "Section-level flags, case citations and a clause-by-clause risk map — in minutes, not hours.",
  },
  {
    role: "Founder",
    line: "Sign NDAs and SaaS agreements knowing exactly where the traps are, in plain English.",
  },
  {
    role: "HR Manager",
    line: "Catch void non-competes, penalty clauses and notice-period issues before offer letters go out.",
  },
  {
    role: "Freelancer",
    line: "Know if you'll get paid, keep your IP, and can walk away — before you sign anything.",
  },
];

const FEATURES = [
  {
    num: "01",
    title: "Danger zones",
    text: "The 3–5 riskiest clauses, pulled out and ranked first — verbatim excerpt, plain-English risk, severity badge.",
    tone: "danger",
  },
  {
    num: "02",
    title: "Clause-by-clause review",
    text: "Every clause scored 1–10 with an explanation of why it's safe, cautionary, or dangerous.",
  },
  {
    num: "03",
    title: "Indian law compliance",
    text: "Specific flags like “Violates Section 27, Indian Contract Act, 1872” — across ICA, DPDP Act 2023, IT Act, Specific Relief Act and Shops & Establishments law.",
  },
  {
    num: "04",
    title: "Redlined rewrites",
    text: "Original clause and a fair, enforceable rewrite side by side — ready to paste into your negotiation.",
  },
  {
    num: "05",
    title: "A verdict for your role",
    text: "Lawyers get citations and reasoning. Everyone else gets an “are you protected?” checklist with zero jargon.",
  },
];

const ACTS = [
  "Indian Contract Act, 1872",
  "DPDP Act, 2023",
  "IT Act, 2000",
  "Specific Relief Act, 1963",
  "Shops & Establishments Acts",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-navy text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/60 mb-4">
            Contract review · Built for India
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight max-w-3xl">
            India's first contract review tool built for everyone.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/75 max-w-2xl">
            Upload any contract and get danger zones, compliance flags and
            ready-to-use redlines — checked against the Indian Contract Act,
            the DPDP Act 2023 and the IT Act. No legal training needed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/review" className="btn-primary !bg-white !text-navy hover:!bg-white/90">
              Try it free →
            </Link>
            <Link
              to="/review?sample=1"
              className="btn-secondary !border-white/30 !text-white hover:!bg-white/10 hover:!border-white/60"
            >
              See a sample report
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
            {ACTS.map((a) => (
              <span key={a} className="text-xs sm:text-sm text-white/55 border-l-2 border-white/20 pl-2">
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role cards ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold">Who is signing?</h2>
        <p className="mt-2 text-navy/60 max-w-xl">
          Pick your role — the entire report changes its language, depth and
          checklist to match.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map(({ role, line }) => (
            <button
              key={role}
              onClick={() => navigate(`/review?role=${encodeURIComponent(role)}`)}
              className="text-left border border-navy/15 rounded-lg p-5 hover:border-navy hover:shadow-sm transition-all group"
            >
              <h3 className="font-bold text-lg group-hover:underline underline-offset-4">{role}</h3>
              <p className="mt-2 text-sm text-navy/65 leading-relaxed">{line}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-navy">
                Start as a {role.toLowerCase()} →
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-navy/10 bg-navy/[0.02]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold">One upload, five outputs</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-navy/10 border border-navy/10 rounded-lg overflow-hidden">
            {FEATURES.map((f) => (
              <div key={f.num} className="bg-white p-6">
                <div className="flex items-baseline gap-3">
                  <span
                    className={`text-xs font-bold tracking-widest ${
                      f.tone === "danger" ? "text-danger" : "text-navy/40"
                    }`}
                  >
                    {f.num}
                  </span>
                  <h3 className="font-bold">{f.title}</h3>
                </div>
                <p className="mt-2.5 text-sm text-navy/65 leading-relaxed">{f.text}</p>
              </div>
            ))}
            <div className="bg-navy text-white p-6 flex flex-col justify-between">
              <p className="text-sm text-white/75 leading-relaxed">
                Plus a silent proofing sweep: undefined terms, broken
                cross-references, vague language and shall/may misuse — woven
                straight into the analysis.
              </p>
              <Link to="/review" className="mt-4 font-semibold text-sm underline underline-offset-4">
                Review a contract →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Disclaimer strip ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="border border-navy/15 rounded-lg p-5 text-sm text-navy/70">
          <strong className="text-navy">Disclaimer:</strong> ContractSafe is for
          informational use only and is not a substitute for legal advice.
          Always have important agreements reviewed by a qualified advocate.
        </div>
      </section>
    </div>
  );
}
