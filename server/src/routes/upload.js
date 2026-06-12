import { Router } from "express";
import multer from "multer";
import { extractPdfText } from "../lib/pdf.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(), // never written to disk
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    const err = new Error("Only PDF files are accepted");
    err.status = 415;
    err.publicMessage =
      "Only PDF files are accepted. For Word documents, copy the text and paste it instead.";
    cb(err);
  },
});

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No file received. Attach a PDF under the field name 'file'." });
    }

    let result;
    try {
      result = await extractPdfText(req.file.buffer);
    } catch (e) {
      const passworded = /password/i.test(e?.message || "");
      return res.status(422).json({
        error: passworded
          ? "This PDF is password-protected. Remove the password and try again, or paste the text instead."
          : "Couldn't read that PDF. It may be corrupted — try re-exporting it, or paste the text instead.",
      });
    }

    const text = result.text;
    if (!text) {
      return res.status(422).json({
        error:
          "This PDF has no selectable text (it's likely a scanned image). Paste the contract text instead.",
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
