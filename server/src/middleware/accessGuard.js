// Defense-in-depth for the expensive (Gemini-cost) endpoints.
//
// CORS only constrains *browsers* — it does nothing against curl, scripts, or
// bots that hit the API directly. These checks run server-side and actually
// refuse to do the work, rather than just hiding the response from a browser.
//
//   1. Optional shared-secret token (API_ACCESS_TOKEN). When set, every request
//      to a guarded route must send a matching `x-api-token` header. This is the
//      only control that genuinely blocks non-browser clients — set it if Gemini
//      cost matters. Leave it unset for an open public demo (behaviour unchanged).
//
//   2. Origin allow-list enforcement. If a browser sends an Origin that isn't in
//      the allow-list we reject with 403 (CORS alone would still execute the
//      request and only block the browser from reading the reply).

/**
 * @param {string[]} allowedOrigins - same list used for CORS.
 */
export function makeAccessGuard(allowedOrigins) {
  const token = process.env.API_ACCESS_TOKEN;
  const allow = new Set(allowedOrigins);

  if (!token) {
    console.warn(
      "⚠  API_ACCESS_TOKEN is not set. The review/upload endpoints are open to any client (CORS does not stop curl/scripts). Set it if Gemini cost is a concern."
    );
  }

  return function accessGuard(req, res, next) {
    // 1) Shared-secret token (timing-safe-ish constant comparison is overkill
    //    here; a leaked token is the real risk, not timing).
    if (token) {
      const provided = req.get("x-api-token");
      if (!provided || provided !== token) {
        return res.status(401).json({ error: "Unauthorized. A valid API token is required." });
      }
    }

    // 2) Reject browser requests from disallowed origins outright.
    const origin = req.get("origin");
    if (origin && !allow.has(origin)) {
      return res.status(403).json({ error: "Origin not allowed." });
    }

    next();
  };
}
