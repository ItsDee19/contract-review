// In dev the Vite proxy forwards /api → http://localhost:3001.
// In production set VITE_API_URL (e.g. https://your-api.up.railway.app).
const BASE = import.meta.env.VITE_API_URL || "";

async function handle(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error */
  }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function uploadPdf(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/upload`, { method: "POST", body: form });
  return handle(res);
}

export async function reviewContract({ contractText, contractType, jurisdiction, userRole }) {
  const res = await fetch(`${BASE}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractText, contractType, jurisdiction, userRole }),
  });
  return handle(res);
}
