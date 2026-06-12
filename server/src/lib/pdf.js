// Server-side PDF text extraction using Mozilla's pdf.js (pdfjs-dist).
// Chosen over pdf-parse: pdf-parse bundles a 2018-era pdf.js that fails
// on many modern PDFs ("bad XRef entry"); pdfjs-dist is the same engine,
// kept current.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdfText(buffer) {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    // We only need text — disable features that require a DOM/worker.
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

  await doc.destroy();

  return {
    text: pages.join("\n\n").replace(/[ \t]+\n/g, "\n").trim(),
    pageCount: doc.numPages,
  };
}
