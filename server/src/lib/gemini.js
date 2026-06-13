import { GoogleGenerativeAI } from "@google/generative-ai";

let _model = null;
let _lastKey = null;

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("GEMINI_API_KEY missing");
    err.status = 500;
    err.publicMessage =
      "Server is not configured with a Gemini API key. Add GEMINI_API_KEY to server/.env (free key: https://aistudio.google.com/app/apikey).";
    throw err;
  }
  // Re-instantiate if the key or model has changed (e.g. between hot-reloads)
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  if (!_model || _lastKey !== process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({ model: modelName });
    _lastKey = process.env.GEMINI_API_KEY;
    console.log(`[gemini] Using model: ${modelName}`);
  }
  return _model;
}

/**
 * Sends the full prompt to Gemini 1.5 Flash and returns parsed JSON.
 * responseMimeType: "application/json" forces valid JSON output —
 * no markdown fence stripping needed.
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
        maxOutputTokens: 8192,
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

  const text = result.response.text();
  try {
    return JSON.parse(text);
  } catch {
    // Extremely rare with responseMimeType json, but never trust blindly.
    const err = new Error("Gemini returned non-JSON output");
    err.status = 502;
    err.publicMessage =
      "The AI returned an unexpected response. Please retry — this usually resolves itself.";
    throw err;
  }
}
