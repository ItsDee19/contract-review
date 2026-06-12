import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { uploadPdf, reviewContract } from "../lib/api.js";
import { SAMPLE_CONTRACT } from "../lib/sampleContract.js";
import LoadingSteps from "../components/LoadingSteps.jsx";

const TYPES = ["NDA", "Employment", "SaaS", "Vendor", "Freelance", "Other"];
const JURISDICTIONS = ["Indian Law", "GDPR", "Both", "Other"];
const ROLES = ["Lawyer", "Founder", "HR Manager", "Freelancer"];

export default function Review() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fileInputRef = useRef(null);

  const isSample = params.get("sample") === "1";
  const [mode, setMode] = useState(isSample ? "paste" : "upload"); // upload | paste
  const [text, setText] = useState(isSample ? SAMPLE_CONTRACT : "");
  const [fileMeta, setFileMeta] = useState(null); // { fileName, pageCount, charCount }
  const [dragOver, setDragOver] = useState(false);

  const [contractType, setContractType] = useState(isSample ? "Employment" : "NDA");
  const [jurisdiction, setJurisdiction] = useState("Indian Law");
  const [userRole, setUserRole] = useState(
    ROLES.includes(params.get("role")) ? params.get("role") : "Founder"
  );

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file) {
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted here. For Word documents, copy the text and use “Paste text”.");
      return;
    }
    setUploading(true);
    try {
      const data = await uploadPdf(file);
      setText(data.text);
      setFileMeta({ fileName: data.fileName, pageCount: data.pageCount, charCount: data.charCount });
    } catch (e) {
      setError(e.message);
      setFileMeta(null);
    } finally {
      setUploading(false);
    }
  }

  async function analyze() {
    setError("");
    if (!text.trim()) {
      setError("Add a contract first — upload a PDF or paste the text.");
      return;
    }
    setAnalyzing(true);
    try {
      const report = await reviewContract({
        contractText: text,
        contractType,
        jurisdiction,
        userRole,
      });
      sessionStorage.setItem("contractsafe:report", JSON.stringify(report));
      navigate("/results");
    } catch (e) {
      setError(e.message);
      setAnalyzing(false);
    }
  }

  if (analyzing) return <LoadingSteps />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-extrabold">Review a contract</h1>
      <p className="mt-2 text-navy/60">
        Three steps: add the contract, tell us the context, analyse.
      </p>

      {/* ── Step 1: contract ── */}
      <section className="mt-8">
        <h2 className="font-bold flex items-center gap-2.5">
          <span className="h-6 w-6 rounded-full bg-navy text-white text-xs font-bold inline-flex items-center justify-center">1</span>
          Add your contract
        </h2>

        <div className="mt-3 inline-flex rounded-md border border-navy/20 overflow-hidden text-sm font-semibold" role="tablist">
          {[
            ["upload", "Upload PDF"],
            ["paste", "Paste text"],
          ].map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 ${mode === m ? "bg-navy text-white" : "bg-white text-navy/70 hover:bg-navy/5"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "upload" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={`mt-4 border-2 border-dashed rounded-lg p-8 sm:p-10 text-center transition-colors ${
              dragOver ? "border-navy bg-navy/5" : "border-navy/25"
            }`}
          >
            {uploading ? (
              <p className="font-medium animate-pulse">Reading your PDF…</p>
            ) : fileMeta ? (
              <div>
                <p className="font-semibold">📄 {fileMeta.fileName}</p>
                <p className="mt-1 text-sm text-navy/60">
                  {fileMeta.pageCount} page{fileMeta.pageCount === 1 ? "" : "s"} ·{" "}
                  {fileMeta.charCount.toLocaleString()} characters extracted
                </p>
                <button
                  className="mt-3 text-sm font-semibold underline underline-offset-4"
                  onClick={() => {
                    setFileMeta(null);
                    setText("");
                  }}
                >
                  Remove and choose another file
                </button>
              </div>
            ) : (
              <>
                <p className="font-medium">Drag and drop a PDF here</p>
                <p className="mt-1 text-sm text-navy/55">or</p>
                <button className="btn-secondary mt-3 !py-2 text-sm" onClick={() => fileInputRef.current?.click()}>
                  Choose a file
                </button>
                <p className="mt-3 text-xs text-navy/50">PDF only · up to 15 MB · parsed on the server, never stored</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div className="mt-4">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFileMeta(null);
              }}
              rows={12}
              maxLength={500000}
              placeholder="Paste the full contract text here…"
              className="w-full border border-navy/20 rounded-lg p-4 text-sm leading-relaxed focus:border-navy focus:ring-1 focus:ring-navy outline-none font-mono"
            />
            <div className="mt-1.5 flex items-center justify-between text-xs text-navy/50">
              <button
                className="underline underline-offset-4 font-semibold"
                onClick={() => {
                  setText(SAMPLE_CONTRACT);
                  setContractType("Employment");
                }}
              >
                Load a sample Indian employment agreement
              </button>
              <span>{text.length.toLocaleString()} characters</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Step 2: context ── */}
      <section className="mt-10">
        <h2 className="font-bold flex items-center gap-2.5">
          <span className="h-6 w-6 rounded-full bg-navy text-white text-xs font-bold inline-flex items-center justify-center">2</span>
          Tell us the context
        </h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="ctype">Contract type</label>
            <select id="ctype" className="select" value={contractType} onChange={(e) => setContractType(e.target.value)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="juri">Jurisdiction</label>
            <select id="juri" className="select" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
              {JURISDICTIONS.map((j) => <option key={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="role">Your role</label>
            <select id="role" className="select" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-navy/50">
          Lawyers get section numbers and case law; everyone else gets plain English.
        </p>
      </section>

      {/* ── Step 3: analyse ── */}
      <section className="mt-10">
        <h2 className="font-bold flex items-center gap-2.5">
          <span className="h-6 w-6 rounded-full bg-navy text-white text-xs font-bold inline-flex items-center justify-center">3</span>
          Analyse
        </h2>
        {error && (
          <div role="alert" className="mt-4 border border-danger/40 bg-danger/5 text-danger rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}
        <button className="btn-primary mt-4 w-full sm:w-auto" onClick={analyze} disabled={uploading}>
          Analyse contract →
        </button>
        <p className="mt-3 text-xs text-navy/50">
          For informational use only. Not a substitute for legal advice.
        </p>
      </section>
    </div>
  );
}
