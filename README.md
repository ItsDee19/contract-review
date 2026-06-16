# ContractSafe

AI contract review built specifically for Indian law, modelled on how a diligent junior associate actually reviews an agreement. Upload a PDF (or paste text) and get a risk verdict, a deal snapshot, danger zones, the protections you're **missing**, a clause-by-clause risk map, compliance flags across 25+ Indian statutes (applied by contract type), ready-to-paste redlines, a negotiation playbook, and an obligations/deadlines matrix — all written for your role: lawyer, founder, HR manager, or freelancer.

> **For informational use only. Not a substitute for legal advice.** Always consult a qualified advocate before signing.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| AI | **Google Gemini** (model set by `GEMINI_MODEL`, default `gemini-2.0-flash-lite`) via `@google/generative-ai` |
| PDF parsing | `pdf-parse` (server-side, in memory — files are never stored) |
| Database | None — stateless per session |

Gemini is called with `responseMimeType: "application/json"`, which forces valid JSON output. The server also tolerates truncated output (it repairs JSON cut off at the token cap) and retries transient `503`/`429` errors with backoff.

## What you get per review

1. **Risk verdict** — a 0–100 risk score with a *sign / negotiate / do-not-sign* call and a one-paragraph rationale, scored for **your** role.
2. **Deal snapshot** — the parties and the key commercial terms (money, term, termination, governing law, dispute resolution) in one glance — the abstract a partner reads first.
3. **Danger zones** — the riskiest clauses, ranked, with verbatim excerpts and severity badges.
4. **Missing protections** — what a good associate catches that most tools miss: the clauses that *should* be there but aren't (liability cap, indemnity, force majeure, data terms…), with a clause to paste in.
5. **Clause-by-clause review** — every clause scored 1–10, color-coded green/yellow/red.
6. **Indian-law compliance** — specific flags like *"Violates Section 27, Indian Contract Act, 1872"*, applied **by contract type** across 25+ statutes (see below), including stamp duty and registration adequacy.
7. **Redlined version** — original vs. suggested rewrite side by side, labelled *"Suggested rewrite — verify with a lawyer"*.
8. **Negotiation playbook** — for each issue: what to **ask** for, an acceptable **fallback**, and **why** it's reasonable.
9. **Obligations & key dates** — who must do what, by when, and what happens if they miss it.
10. **Role-based summary** — lawyers get case citations and statutory reasoning; everyone else gets a plain-English "are you protected?" checklist.

Plus a silent proofing sweep: undefined terms, broken cross-references ("see Clause 4.2" when it doesn't exist), vague language ("promptly", "reasonable time"), party-name inconsistencies, and shall/may/will misuse.

### Statute coverage (the legal "brain")

The relevant statutes are selected **per contract type** (an NDA, an employment agreement and a vendor supply contract are each checked against a different, focused set) — this lives in [`server/src/lib/legalKnowledge.js`](server/src/lib/legalKnowledge.js). Acts covered include: Indian Contract Act 1872, Specific Relief Act 1963, Limitation Act 1963, Indian Stamp Act 1899, Registration Act 1908, Sale of Goods Act 1930, MSMED Act 2006, Negotiable Instruments Act 1881, Arbitration & Conciliation Act 1996, IT Act 2000, DPDP Act 2023, Copyright Act 1957 (+ Trade Marks/Patents/Designs), Companies Act 2013, Competition Act 2002, Consumer Protection Act 2019, FEMA 1999, CGST Act 2017, Transfer of Property Act 1882, the Labour Codes 2019–20 (and the predecessor labour Acts still in force), the POSH Act 2013, and the 2024 criminal-law renames (BNS/BNSS/BSA).

### A note on the AI tier

A review makes **3 streaming Gemini calls** (briefing → clause review → action plan). On Gemini's **free tier** the daily request quota is small (e.g. ~20/day for `gemini-2.5-flash`) and the endpoint frequently returns `503 high demand`, so a few back-to-back reviews can exhaust the day's quota. For real use, put a billed Gemini key on the project (or point `GEMINI_MODEL` at a higher-quota model). The retry/backoff logic smooths over momentary blips but cannot create quota.

---

## Get a Gemini API key (free)

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with a Google account → **Create API key**
3. Copy the key — you'll paste it into `server/.env` below. The free tier is enough for development and light usage.

## Run locally

Requires Node.js ≥ 18.

```bash
# 1. Clone
git clone https://github.com/ItsDee19/contract-review.git
cd contract-review

# 2. Install everything (root helper + both apps)
npm install
npm run install:all

# 3. Configure the backend
cp server/.env.example server/.env
#    → open server/.env and paste your GEMINI_API_KEY

# 4. Run both apps together
npm run dev
```

- Frontend: http://localhost:5173 (Vite proxies `/api/*` to the backend)
- Backend: http://localhost:3001 (health check at `/api/health`)

Prefer separate terminals? `npm run dev:server` and `npm run dev:client`.

## API

### `POST /api/upload`
`multipart/form-data` with field `file` (PDF, ≤ 15 MB). Returns `{ text, pageCount, charCount, fileName }`. Rejects scanned/image-only and password-protected PDFs with a helpful message.

### `POST /api/review`
```json
{
  "contractText": "…",
  "contractType": "NDA | Employment | SaaS | Vendor | Freelance | Other",
  "jurisdiction": "Indian Law | GDPR | Both | Other",
  "userRole": "Lawyer | Founder | HR Manager | Freelancer"
}
```
Returns the full report JSON (`dealSummary`, `overallRisk`, `dangerZones`, `missingClauses`, `clauseReview`, `complianceFlags`, `redlines`, `negotiationPlaybook`, `obligations`, `roleSummary`, `proofingIssues`, `disclaimer`). Errors handled: empty text, text under 100 chars, text over 500,000 chars, missing/invalid API key, Gemini failures.

### `POST /api/review/stream`
Same body as `/api/review`, but streams the report over Server-Sent Events in three phases (briefing → clause review → action plan) so the UI renders each section as it arrives. This is what the web app uses.

## Environment variables

| Variable | Where | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | `server/.env` | ✅ | Google Gemini API key — https://aistudio.google.com/app/apikey |
| `PORT` | `server/.env` | optional | API port (default `3001`) |
| `CORS_ORIGINS` | `server/.env` | prod only | Comma-separated allowed frontend origins for CORS (browser cross-origin protection). |
| `API_ACCESS_TOKEN` | `server/.env` | optional | Shared secret for `/api/review*` and `/api/upload`. When set, clients must send it as the `x-api-token` header — the only control that stops curl/scripts from burning your Gemini quota. Leave unset for an open public demo. |
| `REDIS_URL` | `server/.env` | optional | Redis connection string to share rate-limit counters across multiple instances (Vercel functions / Railway replicas). Without it, each instance counts independently. |
| `VITE_API_URL` | client env (deploy only) | prod only | Full URL of the deployed backend, e.g. `https://your-api.up.railway.app`. Leave unset in dev — Vite proxies `/api` automatically. |
| `VITE_API_TOKEN` | client env (deploy only) | optional | Must match the server's `API_ACCESS_TOKEN` when the API is locked down. Sent as the `x-api-token` header. |

`.env` is git-ignored; only `.env.example` is committed. Never hardcode keys.

> **Note on `VITE_API_TOKEN`:** anything baked into a Vite frontend is publicly visible in the shipped JS — this token only keeps casual scripts and other origins out, it is not a true secret. For a hard guarantee against quota abuse, put the backend behind real auth or a server-side proxy.

## Deploy

**Backend → Railway (or Render)**
1. New project → deploy from this GitHub repo, root directory `server/`.
2. Set env vars: `GEMINI_API_KEY` (Railway/Render inject `PORT` automatically — the server respects it).
3. Start command: `npm start`. Note the public URL it gives you.

**Frontend → Vercel**
1. New project → import this repo, root directory `client/`.
2. Framework preset: Vite. Build command `npm run build`, output `dist`.
3. Add env var `VITE_API_URL` = your Railway/Render backend URL.
4. Deploy. (CORS is open on the API by default; lock it to your Vercel domain in `server/src/index.js` for production.)

## Design decisions (made without asking, as briefed)

- **Name kept as ContractSafe** — clear, trustworthy, matches the brief.
- **Reports live in `sessionStorage` only** — stateless by design; nothing is persisted server-side, and PDFs are parsed in memory and discarded.
- **Demo content** — the "sample contract" is a realistic, deliberately flawed Indian employment agreement (void S.27 non-compete, penalty clause, DPDP-problematic data consent, broken cross-reference, vague language) so every report section demonstrates itself.
- **Response normalisation** — the server validates/normalises Gemini's JSON before returning it, so the UI never crashes on a missing field.
- **pdf-parse via `lib/pdf-parse.js`** — avoids the package's debug harness that misbehaves under ESM imports.

## Legal disclaimer

ContractSafe provides automated, AI-generated information about contract text. It is **not** a law firm, does **not** provide legal advice, and no advocate–client relationship is created by using it. AI output can be incomplete or wrong. Statutes and case law change. Before signing, negotiating, or relying on any analysis produced by this tool, consult a qualified advocate licensed to practise in the relevant jurisdiction.
