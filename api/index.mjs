// Vercel Serverless Function entry point.
// Imports the Express app and exports it as the default handler.
// Vercel routes /api/* requests here via vercel.json rewrites.
import app from "../server/src/app.js";

export default app;
