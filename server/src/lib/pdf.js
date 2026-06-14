// Server-side PDF text extraction using unpdf.
// Works cleanly on Node ≥18 with no canvas/DOMMatrix polyfills needed.
import { extractText } from "unpdf";

export async function extractPdfText(buffer) {
  const pdf = new Uint8Array(buffer);
  const { text } = await extractText(pdf, { mergePages: false });

  return {
    text: text.join("\n\n").replace(/[ \t]+\n/g, "\n").trim(),
    pageCount: text.length,
  };
}
