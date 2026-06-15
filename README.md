# ContractSafe

AI contract review built specifically for Indian law. Upload a PDF (or paste text) and get danger zones, a clause-by-clause risk map, compliance flags against Indian statutes, ready-to-paste redlines, and a verdict written for your role — lawyer, founder, HR manager, or freelancer.

> **For informational use only. Not a substitute for legal advice.** Always consult a qualified advocate before signing.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| AI | **Google Gemini 1.5 Flash** (free tier) via `@google/generative-ai` |
| PDF parsing | `pdf-parse` (server-side, in memory — files are never stored) |
| Database | None — stateless per session |

Gemini is called with `responseMimeType: "application/json"`, which forces valid JSON output and removes the need to strip markdown fences.

## What you get per review

1. **Danger zones** — the 3–5 riskiest clauses, ranked, with verbatim excerpts and severity badges.
2. **Clause-by-clause review** — every clause scored 1–10, color-coded green/yellow/red.
3. **Indian law compliance** — specific flags like *"Violates Section 27, Indian Contract Act, 1872"*, checked against the ICA 1872, DPDP Act 2023, IT Act 2000, Specific Relief Act 1963, and Shops & Establishments law.
4. **Redlined version** — original vs. suggested rewrite side by side, labelled *"Suggested rewrite — verify with a lawyer"*.
5. **Role-based summary** — lawyers get case citations and statutory reasoning; everyone else gets a plain-English "are you protected?" checklist.

Plus a silent proofing sweep woven into the analysis: undefined terms, broken cross-references ("see Clause 4.2" when it doesn't exist), vague language ("promptly", "reasonable time"), party-name inconsistencies, and shall/may/will misuse.

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
Returns the full report JSON (`dangerZones`, `clauseReview`, `complianceFlags`, `redlines`, `roleSummary`, `proofingIssues`, `disclaimer`). Errors handled: empty text, text under 100 chars, text over 500,000 chars, missing/invalid API key, Gemini failures.

## Environment variables

| Variable | Where | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | `server/.env` | ✅ | Google Gemini API key — https://aistudio.google.com/app/apikey |
| `PORT` | `server/.env` | optional | API port (default `3001`) |
| `CORS_ORIGINS` | `server/.env` | prod only | Comma-separated allowed frontend origins. Also enforced server-side (disallowed origins get 403). |
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
