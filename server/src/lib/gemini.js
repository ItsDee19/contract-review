import { GoogleGenerativeAI } from "@google/generative-ai";

let _model = null;
let _lastKey = null;
let _lastModel = null;

function modelName() {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
}

/**
 * Per-model output-token ceiling. The 2.5 "thinking" models spend part of the
 * output budget on reasoning, so an 8K cap truncates the visible JSON — they
 * support up to 65K, so we give them generous room. Older/flash-lite models
 * cap at 8K and reject larger requests, so they stay at 8K.
 */
function maxOutputFor(name = modelName()) {
  return /2\.5/.test(name) ? 32768 : 8192;
}

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("GEMINI_API_KEY missing");
    err.status = 500;
    err.publicMessage =
      "Server is not configured with a Gemini API key. Add GEMINI_API_KEY to server/.env (free key: https://aistudio.google.com/app/apikey).";
    throw err;
  }
  // Re-instantiate if the key OR model name has changed (e.g. between hot-reloads)
  const name = modelName();
  if (!_model || _lastKey !== process.env.GEMINI_API_KEY || _lastModel !== name) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({ model: name });
    _lastKey = process.env.GEMINI_API_KEY;
    _lastModel = name;
    console.log(`[gemini] Using model: ${name}`);
  }
  return _model;
}

/** Rejects after `ms` milliseconds — used to race against Gemini calls. */
function timeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => {
      const err = new Error(`Gemini API call timed out after ${ms / 1000}s`);
      err.status = 504;
      err.publicMessage = "The AI took too long to respond. Please try again.";
      reject(err);
    }, ms)
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Transient = worth retrying. Google returns 503 ("high demand"), 429
 * (rate limit) and occasional 500s under load — these usually clear within a
 * second or two. Our timeout() (504) is also retryable.
 */
function isTransient(e) {
  const msg = String(e?.message ?? e).toLowerCase();
  return (
    e?.status === 504 ||
    /\b(429|500|503)\b/.test(msg) ||
    msg.includes("service unavailable") ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("try again")
  );
}

/**
 * Call Gemini once, racing it against a per-attempt timeout, and retry on
 * transient failures with exponential backoff + jitter. Retrying matters most
 * for the streaming path, where 5 sequential calls mean a single momentary 503
 * would otherwise abort the whole review.
 */
async function generateWithRetry(prompt, { perAttemptMs = 90_000, attempts = 3 } = {}) {
  const model = getModel();
  const request = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: maxOutputFor(),
    },
  };

  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await Promise.race([model.generateContent(request), timeout(perAttemptMs)]);
      return parseGeminiJson(result.response.text());
    } catch (e) {
      lastErr = e;
      if (attempt < attempts && isTransient(e)) {
        const backoff = Math.round(700 * 2 ** (attempt - 1) * (1 + Math.random() * 0.3));
        console.warn(`[gemini] Transient error (attempt ${attempt}/${attempts}); retrying in ${backoff}ms: ${e?.message ?? e}`);
        await sleep(backoff);
        continue;
      }
      break;
    }
  }

  console.error("[gemini] API call failed:", lastErr?.message ?? lastErr);
  if (lastErr?.publicMessage) throw lastErr; // structured (e.g. timeout, bad-JSON)
  const err = new Error(`Gemini API call failed: ${lastErr?.message ?? lastErr}`);
  err.status = 502;
  err.publicMessage =
    "The AI service is temporarily unavailable or the API key is invalid. Please try again in a moment.";
  throw err;
}

/**
 * Sends the full prompt to Gemini and returns parsed JSON (non-streaming path).
 */
export async function analyzeContract(fullPrompt) {
  return generateWithRetry(fullPrompt, { perAttemptMs: 120_000, attempts: 3 });
}

/**
 * Streaming analysis — one section prompt at a time, used by the SSE route.
 */
export async function analyzeSection(sectionPrompt) {
  return generateWithRetry(sectionPrompt, { perAttemptMs: 90_000, attempts: 3 });
}

/**
 * Best-effort repair of a JSON string that was cut off mid-output (e.g. the
 * model hit the token cap). We walk the text tracking string/escape state and
 * bracket depth, roll back to the last fully-closed array/object element, then
 * append the closers needed to balance the structure. This recovers a valid
 * (if slightly shorter) object instead of failing the whole analysis.
 */
function repairTruncatedJson(raw) {
  const start = raw.search(/[{[]/);
  if (start < 0) return null;
  const s = raw.slice(start);

  const stack = [];
  let inStr = false;
  let esc = false;
  let lastTopComplete = -1; // end index of a complete top-level structure
  let lastElemEnd = -1; // end index right after the last closed }/] at any depth
  let stackAtElemEnd = null;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") {
      stack.pop();
      lastElemEnd = i + 1;
      stackAtElemEnd = [...stack];
      if (stack.length === 0) lastTopComplete = i + 1;
    }
  }

  const tryParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return undefined;
    }
  };
  const stripTrailingComma = (str) => str.replace(/,\s*$/, "");

  // 1) A complete top-level object/array exists — use the largest one.
  if (lastTopComplete > 0) {
    const r = tryParse(s.slice(0, lastTopComplete));
    if (r !== undefined) return r;
  }
  // 2) Roll back to the last closed nested element and close its ancestors.
  if (lastElemEnd > 0 && stackAtElemEnd) {
    const r = tryParse(stripTrailingComma(s.slice(0, lastElemEnd)) + stackAtElemEnd.slice().reverse().join(""));
    if (r !== undefined) return r;
  }
  // 3) Last resort (truncated before any element closed): close the open string
  //    and every open bracket at EOF to salvage the partial leading element.
  if (stack.length) {
    const tail = stripTrailingComma(inStr ? s + '"' : s) + stack.slice().reverse().join("");
    const r = tryParse(tail);
    if (r !== undefined) return r;
  }
  return null;
}

/**
 * Parse JSON from Gemini output, handling markdown fences, preamble text, and
 * truncated (token-capped) responses.
 */
function parseGeminiJson(raw) {
  // Try direct parse first (works for most models with responseMimeType json)
  try {
    return JSON.parse(raw);
  } catch { /* fall through */ }

  // Thinking models may wrap JSON in ```json ... ``` fences or include preamble.
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch { /* fall through */ }
  }
  const block = raw.match(/(\{[\s\S]*\})/);
  if (block) {
    try {
      return JSON.parse(block[1]);
    } catch { /* fall through */ }
  }

  // Last resort: the output was likely truncated at the token cap — repair it.
  const repaired = repairTruncatedJson(raw);
  if (repaired) {
    console.warn("[gemini] Recovered a truncated JSON response via repair.");
    return repaired;
  }

  console.error("[gemini] Non-JSON response (first 500 chars):", raw.slice(0, 500));
  const err = new Error("Gemini returned non-JSON output");
  err.status = 502;
  err.publicMessage =
    "The AI returned an unexpected response. Please retry — this usually resolves itself.";
  throw err;
}
