// Server-side Word document (.docx) text extraction using mammoth.
import mammoth from "mammoth";

/**
 * Extracts plain text from a .docx file buffer.
 *
 * @param {Buffer} buffer - The raw buffer of the .docx file.
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
export async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });

  const text = result.value
    .replace(/[ \t]+\n/g, "\n") // trim trailing whitespace on lines
    .replace(/\n{3,}/g, "\n\n") // collapse excessive blank lines
    .trim();

  // Word documents don't have a reliable page count without rendering;
  // estimate 1 page per ~3000 characters as a rough approximation.
  const pageCount = Math.max(1, Math.round(text.length / 3000));

  return { text, pageCount };
}
