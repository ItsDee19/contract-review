// Server-side PDF text extraction using pdf-parse.
// Lightweight, pure Node.js — no canvas, DOMMatrix, or worker dependencies.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractPdfText(buffer) {
  const data = await pdfParse(buffer);

  return {
    text: data.text.replace(/[ \t]+\n/g, "\n").trim(),
    pageCount: data.numpages,
  };
}
