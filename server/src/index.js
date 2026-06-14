import app from "./app.js";

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`ContractSafe API listening on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "⚠  GEMINI_API_KEY is not set. /api/review will fail until you add it to server/.env (see .env.example)."
    );
  }
});

// Graceful shutdown — lets in-flight requests complete before exiting.
function shutdown(signal) {
  console.log(`[server] Received ${signal}. Shutting down gracefully…`);
  server.close(() => {
    console.log("[server] All connections closed. Exiting.");
    process.exit(0);
  });
  // Force-quit if shutdown takes longer than 10s.
  setTimeout(() => {
    console.error("[server] Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

