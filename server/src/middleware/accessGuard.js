// Defense-in-depth for the expensive (Gemini-cost) endpoints.
//
// CORS only constrains *browsers* — it does nothing against curl, scripts, or
// bots that hit the API directly. The shared-secret token below is the control
// that actually blocks non-browser clients: set API_ACCESS_TOKEN if Gemini cost
// matters and clients must then send a matching `x-api-token` header.
//
// Browser origin restriction is left entirely to CORS (configured in app.js).
// We deliberately do NOT re-check the Origin header here: an allow-list adds no
// protection against curl/scripts (they can omit or spoof Origin), and enforcing
// it server-side wrongly rejected legitimate same-origin requests proxied
// through the Vite dev server (e.g. when Vite runs on a non-default port).

export function makeAccessGuard() {
  const token = process.env.API_ACCESS_TOKEN;

  if (!token) {
    console.warn(
      "⚠  API_ACCESS_TOKEN is not set. The review/upload endpoints are open to any client (CORS does not stop curl/scripts). Set it if Gemini cost is a concern."
    );
  }

  return function accessGuard(req, res, next) {
    if (token) {
      const provided = req.get("x-api-token");
      if (!provided || provided !== token) {
        return res.status(401).json({ error: "Unauthorized. A valid API token is required." });
      }
    }
    next();
  };
}
