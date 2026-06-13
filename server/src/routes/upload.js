import { Router } from "express";
import multer from "multer";
import { extractPdfText } from "../lib/pdf.js";
import { extractDocxText } from "../lib/docx.js";

const router = Router();

const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc (older format — we'll attempt docx extraction)
]);

const upload = multer({
  storage: multer.memoryStorage(), // never written to disk
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_MIMES.has(file.mimetype)) return cb(null, true);
    const err = new Error("Unsupported file type");
    err.status = 415;
    err.publicMessage =
      "Only PDF and Word (.docx) files are accepted. For other formats, copy the text and paste it instead.";
    cb(err);
  },
});

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No file received. Attach a PDF or Word document under the field name 'file'." });
    }

    const isPdf =
      req.file.mimetype === "application/pdf" ||
      req.file.originalname.toLowerCase().endsWith(".pdf");

    let result;
    try {
      if (isPdf) {
        result = await extractPdfText(req.file.buffer);
      } else {
        result = await extractDocxText(req.file.buffer);
      }
    } catch (e) {
      const passworded = /password/i.test(e?.message || "");
      if (isPdf) {
        return res.status(422).json({
          error: passworded
            ? "This PDF is password-protected. Remove the password and try again, or paste the text instead."
            : "Couldn't read that PDF. It may be corrupted — try re-exporting it, or paste the text instead.",
        });
      }
      return res.status(422).json({
        error:
          "Couldn't read that Word document. Make sure it's a valid .docx file, or paste the text instead.",
      });
    }

    const text = result.text;
    if (!text) {
      return res.status(422).json({
        error: isPdf
          ? "This PDF has no selectable text (it's likely a scanned image). Paste the contract text instead."
          : "This Word document appears to be empty. Paste the contract text instead.",
      });
    }

    res.json({
      text,
      pageCount: result.pageCount,
      charCount: text.length,
      fileName: req.file.originalname
        .replace(/[/\\<>"'`\x00-\x1f]/g, "_")
        .slice(0, 255),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
