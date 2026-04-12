"use client";

import { useState, useEffect } from "react";

const ADMIN_PIN = "1234"; // TODO: 後で変更してください

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
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
      setTimeout(() => setError(false), 2000);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 tracking-wide">管理者ログイン</h1>
          <div className="w-8 h-px mx-auto mt-2" style={{ background: "#d4af37" }} />
        </div>

        <div>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="暗証番号を入力"
            className="w-full border rounded-lg px-4 py-3 text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-1"
            style={{ borderColor: error ? "#ef4444" : "#e8dcc8" }}
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-500 mt-2">暗証番号が違います</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: "#b8960c" }}
        >
          ログイン
        </button>
      </form>
    </div>
  );
}
