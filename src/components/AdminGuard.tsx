"use client";

import { useState, useEffect } from "react";

const ADMIN_PIN = "1234";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === "true") setAuthenticated(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!mounted) return null;
  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-in">
      <form onSubmit={handleSubmit} className="w-full max-w-[280px] text-center">
        <div className="mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f5f0e1 0%, #e8dcc8 100%)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b8960c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-800 tracking-wide">
            管理者ログイン
          </h1>
          <p className="text-xs text-gray-400 mt-1.5 tracking-wide">暗証番号を入力してください</p>
        </div>

        <div className="mb-5">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="* * * *"
            className={`w-full border rounded-xl px-4 py-3.5 text-center text-lg tracking-[0.5em] focus:outline-none transition-all duration-200 ${
              error ? "border-red-300 bg-red-50/50" : ""
            }`}
            style={error ? {} : { borderColor: "#e8dcc8" }}
            autoFocus
          />
          <div className="h-5 mt-1.5">
            {error && (
              <p className="text-xs text-red-400 animate-in">暗証番号が違います</p>
            )}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3.5">
          ログイン
        </button>
      </form>
    </div>
  );
}
