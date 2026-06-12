import "dotenv/config";
import express from "express";
import cors from "cors";
import reviewRouter from "./routes/review.js";
import uploadRouter from "./routes/upload.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "contractsafe-api" });
});

app.use("/api/review", reviewRouter);
app.use("/api/upload", uploadRouter);

// Central error handler — keeps multer & route errors consistent
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "File too large. Maximum upload size is 15 MB." });
  }
  res.status(err.status || 500).json({
    error: err.publicMessage || "Something went wrong. Please try again.",
  });
});

app.listen(PORT, () => {
  console.log(`ContractSafe API listening on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "⚠  GEMINI_API_KEY is not set. /api/review will fail until you add it to server/.env (see .env.example)."
    );
  }
});
