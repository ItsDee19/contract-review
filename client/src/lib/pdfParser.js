// Client-side PDF text extraction using Mozilla's pdf.js (pdfjs-dist).
// Runs entirely in the browser — no server upload needed.
import * as pdfjsLib from "pdfjs-dist";
// Bundle the worker locally. Vite resolves `?url` to a hashed asset served from
// our own origin, so PDF parsing never depends on a third-party CDN being
// reachable or untampered — and the worker version always matches pdfjs-dist.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Extracts text from a PDF File object in the browser.
 * Mirrors the server-side extractPdfText logic exactly.
 *
 * @param {File} file - A PDF File object from an <input> or drop event.
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
export async function parsePdfInBrowser(file) {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableFontFace: true,
    isEvalSupported: false,
  });

  const doc = await loadingTask.promise;
  const pages = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Rebuild lines: pdf.js gives positioned items; join with spaces and
    // honour its end-of-line markers.
    let pageText = "";
    for (const item of content.items) {
      if (item.str) pageText += item.str;
      if (item.hasEOL) pageText += "\n";
      else if (item.str && !item.str.endsWith(" ")) pageText += " ";
    }
    pages.push(pageText.trim());
    page.cleanup();
  }

  const numPages = doc.numPages;
  await doc.destroy();

  return {
    text: pages.join("\n\n").replace(/[ \t]+\n/g, "\n").trim(),
    pageCount: numPages,
  };
}
