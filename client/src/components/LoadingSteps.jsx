import { useEffect, useState } from "react";

const STEPS = [
  "Reading contract...",
  "Checking Indian law...",
  "Building your report...",
];

/**
 * Animated progress bar with rotating step labels. The bar advances on a
 * timer toward ~92% and only completes when the API actually responds
 * (the parent unmounts this component).
 */
export default function LoadingSteps() {
  const [stepIdx, setStepIdx] = useState(0);
  const [pct, setPct] = useState(4);

  useEffect(() => {
    const stepTimer = setInterval(
      () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)),
      6000
    );
    const pctTimer = setInterval(
      () => setPct((p) => Math.min(p + Math.random() * 3.5, 92)),
      400
    );
    return () => {
      clearInterval(stepTimer);
      clearInterval(pctTimer);
    };
  }, []);

  return (
    <div className="max-w-md mx-auto text-center py-16 px-4" role="status" aria-live="polite">
      <p className="font-semibold text-lg">{STEPS[stepIdx]}</p>
      <div className="mt-5 h-2 w-full bg-navy/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-navy rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ol className="mt-6 space-y-1.5 text-sm text-left inline-block">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 ${
              i < stepIdx ? "text-navy/50 line-through" : i === stepIdx ? "text-navy font-medium" : "text-navy/35"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                i <= stepIdx ? "bg-navy" : "bg-navy/25"
              } ${i === stepIdx ? "animate-pulse" : ""}`}
            />
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-navy/50">
        Long contracts can take 20–40 seconds. Don't close this tab.
      </p>
    </div>
  );
}
