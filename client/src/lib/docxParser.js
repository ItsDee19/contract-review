// Client-side Word document (.docx) text extraction using mammoth.
// Runs entirely in the browser — no server upload needed.
import mammoth from "mammoth";

/**
 * Extracts plain text from a .docx File object in the browser.
 *
 * @param {File} file - A .docx File object from an <input> or drop event.
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
export async function parseDocxInBrowser(file) {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({ arrayBuffer });

  const text = result.value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Estimate page count (no reliable way in-browser without rendering)
  const pageCount = Math.max(1, Math.round(text.length / 3000));

  return { text, pageCount };
}
