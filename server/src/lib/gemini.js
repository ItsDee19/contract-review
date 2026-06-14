import { GoogleGenerativeAI } from "@google/generative-ai";

let _model = null;
let _lastKey = null;
let _lastModel = null;

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("GEMINI_API_KEY missing");
    err.status = 500;
    err.publicMessage =
      "Server is not configured with a Gemini API key. Add GEMINI_API_KEY to server/.env (free key: https://aistudio.google.com/app/apikey).";
    throw err;
  }
  // Re-instantiate if the key OR model name has changed (e.g. between hot-reloads)
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  if (!_model || _lastKey !== process.env.GEMINI_API_KEY || _lastModel !== modelName) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({ model: modelName });
    _lastKey = process.env.GEMINI_API_KEY;
    _lastModel = modelName;
    console.log(`[gemini] Using model: ${modelName}`);
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

/**
 * Sends the full prompt to Gemini and returns parsed JSON.
 * responseMimeType: "application/json" forces valid JSON output on most models,
 * but thinking models (2.5+) may still wrap it in markdown fences.
 */
export async function analyzeContract(fullPrompt) {
  const model = getModel();

  let result;
  try {
    result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 16384,
      },
    });
  } catch (e) {
    // Log the real error for Vercel function logs / local console
    console.error("[gemini] API call failed:", e?.message ?? e);
    const err = new Error(`Gemini API call failed: ${e.message}`);
    err.status = 502;
    err.publicMessage =
      "The AI service is temporarily unavailable or the API key is invalid. Please try again in a moment.";
    throw err;
  }

  return parseGeminiJson(result.response.text());
}

/**
 * Streaming analysis — calls Gemini for a single section prompt and returns parsed JSON.
 * Used by the SSE route to send sections one at a time.
 */
export async function analyzeSection(sectionPrompt) {
  const model = getModel();

  let result;
  try {
    // Race the Gemini call against a 60-second timeout.
    result = await Promise.race([
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: sectionPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
      timeout(60_000),
    ]);
  } catch (e) {
    console.error("[gemini] Section call failed:", e?.message ?? e);
    // Re-throw structured errors (e.g. from our timeout()) directly.
    if (e.publicMessage) throw e;
    const err = new Error(`Gemini API call failed: ${e.message}`);
    err.status = 502;
    err.publicMessage =
      "The AI service is temporarily unavailable or the API key is invalid. Please try again in a moment.";
    throw err;
  }

  return parseGeminiJson(result.response.text());
}

/**
 * Parse JSON from Gemini output, handling markdown fences and preamble text.
 */
function parseGeminiJson(raw) {
  // Try direct parse first (works for most models with responseMimeType json)
  try {
    return JSON.parse(raw);
  } catch {
    // Thinking models may wrap JSON in ```json ... ``` fences or include preamble text.
    // Extract the first { ... } or [ ... ] block.
    const jsonMatch =
      raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/) ||
      raw.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch { /* fall through */ }
    }
    console.error("[gemini] Non-JSON response (first 500 chars):", raw.slice(0, 500));
    const err = new Error("Gemini returned non-JSON output");
    err.status = 502;
    err.publicMessage =
      "The AI returned an unexpected response. Please retry — this usually resolves itself.";
    throw err;
  }
}
