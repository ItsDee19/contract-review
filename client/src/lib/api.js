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

/**
 * Streaming review via Server-Sent Events.
 *
 * Calls POST /api/review/stream and reads the SSE response.
 * onSection(name, data) — fires when a report section arrives (e.g. "dangerZones", [...]).
 * onPhase(phase, label) — fires when a new analysis phase starts.
 * onDone(meta, disclaimer) — fires when all phases complete.
 * onError(message) — fires on error.
 *
 * Returns an abort function the caller can use to cancel.
 */
export function reviewContractStream({
  contractText,
  contractType,
  jurisdiction,
  userRole,
  onSection,
  onPhase,
  onDone,
  onError,
}) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE}/api/review/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText, contractType, jurisdiction, userRole }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let body;
        try { body = await res.json(); } catch { /* ignore */ }
        throw new Error(body?.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines: "data: {...}\n\n"
        // Split on double newlines and keep any incomplete trailing chunk in buffer.
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? ""; // last element may be incomplete

        for (const event of events) {
          // Each event may have multiple lines; find the "data: " line.
          for (const line of event.split("\n")) {
            if (!line.startsWith("data: ")) continue;

            try {
              const payload = JSON.parse(line.slice(6));

              switch (payload.type) {
                case "phase":
                  onPhase?.(payload.phase, payload.label);
                  break;
                case "section":
                  onSection?.(payload.name, payload.data);
                  break;
                case "done":
                  onDone?.(payload.meta, payload.disclaimer);
                  break;
                case "error":
                  onError?.(payload.message);
                  break;
              }
            } catch {
              // Skip unparseable lines (keepalive comments, etc.)
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        onError?.(err.message || "Connection lost. Please try again.");
      }
    }
  })();

  return () => controller.abort();
}
