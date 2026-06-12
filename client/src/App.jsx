import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Landing from "./pages/Landing.jsx";
import Review from "./pages/Review.jsx";
import Results from "./pages/Results.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-navy/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-navy text-white text-xs font-extrabold">CS</span>
          ContractSafe
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-widest text-navy/50 border border-navy/20 rounded px-1.5 py-0.5 ml-1">
            Indian law
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/" className="hidden sm:block text-sm font-medium text-navy/70 hover:text-navy">
            Home
          </Link>
          <Link to="/review" className="btn-primary !px-4 !py-2 text-sm">
            Review a contract
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-navy/10 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-navy/60">
          © {new Date().getFullYear()} ContractSafe. Built for Indian contracts.
        </p>
        <p className="text-xs text-navy/50 max-w-md">
          For informational use only. Not a substitute for legal advice — always
          consult a qualified advocate before signing.
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      {/* Disclaimer banner — always visible */}
      <div className="bg-navy text-white/90 text-center text-xs sm:text-sm px-4 py-2">
        For informational use only. Not a substitute for legal advice.
      </div>
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/review" element={<Review />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
