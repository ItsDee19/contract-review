import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import reviewRouter from "./routes/review.js";
import reviewStreamRouter from "./routes/reviewStream.js";
import uploadRouter from "./routes/upload.js";

const app = express();

// ── Trust Vercel / reverse-proxy headers ─────────────────────────
// Required so express-rate-limit can read X-Forwarded-For correctly.
app.set("trust proxy", 1);

// ── Security headers ─────────────────────────────────────────────
app.use(helmet());

// ── CORS — restrict to known frontend origins ────────────────────
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGINS) {
  console.warn(
    "⚠  CORS_ORIGINS is not set. Defaulting to localhost — set CORS_ORIGINS to your deployed frontend URL in production."
  );
}

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: false, // No cookies/sessions used — explicit for clarity
}));

app.use(express.json({ limit: "10mb" }));

// ── Rate limiters ────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads. Please wait a few minutes." },
});

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many review requests. Please wait a few minutes." },
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "contractsafe-api" });
});

app.use("/api/review/stream", reviewLimiter, reviewStreamRouter);
app.use("/api/review", reviewLimiter, reviewRouter);
app.use("/api/upload", uploadLimiter, uploadRouter);

// Central error handler — keeps multer & route errors consistent
app.use((err, _req, res, _next) => {
  console.error(
    "[ERROR]",
    err.message,
    ...(process.env.NODE_ENV !== "production" ? [err.stack] : [])
  );
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "File too large. Maximum upload size is 15 MB." });
  }
  res.status(err.status || 500).json({
    error: err.publicMessage || "Something went wrong. Please try again.",
  });
});

export default app;
