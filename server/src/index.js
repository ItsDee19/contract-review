import app from "./app.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`ContractSafe API listening on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      "⚠  GEMINI_API_KEY is not set. /api/review will fail until you add it to server/.env (see .env.example)."
    );
  }
});

