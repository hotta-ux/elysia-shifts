"use client";

import { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";

type ShiftEntry = {
  id: number;
  staff_id: number;
  date: string;
  shift_type: "early" | "mid" | "late";
  staff_name: string;
  experience_level: string;
  is_owner: number;
  is_confirmed: number;
};

const SHIFT_TYPES = [
  { key: "early", label: "早番", time: "8:00-13:00" },
  { key: "mid", label: "中番", time: "13:00-18:00" },
  { key: "late", label: "遅番", time: "18:00-23:00" },
];

function getDaysInMonth(year: number, month: number) {
  const days: string[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return days;
}

function getDayOfWeek(dateStr: string) {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[new Date(dateStr).getDay()];
}

function isWeekend(dateStr: string) {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

export default function SchedulePage() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [year, setYear] = useState(nextMonth.getFullYear());
  const [month, setMonth] = useState(nextMonth.getMonth() + 1);
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);

  const fetchShifts = useCallback(async () => {
    const res = await fetch(`/api/shifts?month=${monthStr}`);
    const data = await res.json();
    setShifts(data);
  }, [monthStr]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  useEffect(() => {
    const saved = localStorage.getItem("claude_api_key");
    if (saved) setApiKey(saved);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("claude_api_key", key);
  };

  const generateShift = async () => {
    if (!apiKey) { setError("Claude APIキーを入力してください"); return; }
    setGenerating(true);
    setError("");
    setNotes("");
    try {
      const res = await fetch("/api/generate-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: monthStr, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "エラーが発生しました"); }
      else { setNotes(data.notes || ""); await fetchShifts(); }
    } catch { setError("通信エラーが発生しました"); }
    finally { setGenerating(false); }
  };

  const confirmShifts = async () => {
    if (!confirm("このシフトを確定しますか？")) return;
    await fetch("/api/shifts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: monthStr, confirm: true }),
    });
    await fetchShifts();
  };

  const exportCsv = () => {
    const header = ["日付", "曜日", "早番(8-13)", "中番(13-18)", "遅番(18-23)"];
    const rows = days.map((date) => {
      const dow = getDayOfWeek(date);
      const d = parseInt(date.split("-")[2]);
      const isTuesday = new Date(date).getDay() === 2;
      if (isTuesday) return [`${d}`, dow, "定休日", "定休日", "定休日"];
      const getStaff = (type: string) =>
        shifts.filter((s) => s.date === date && s.shift_type === type)
          .map((s) => `${s.staff_name}${s.is_owner ? "(Owner)" : ""}`)
          .join(" / ") || "-";
      return [`${d}`, dow, getStaff("early"), getStaff("mid"), getStaff("late")];
    });

    const bom = "\uFEFF";
    const csv = bom + [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shift_${year}_${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shiftsByDate = new Map<string, ShiftEntry[]>();
  shifts.forEach((s) => {
    const arr = shiftsByDate.get(s.date) || [];
    arr.push(s);
    shiftsByDate.set(s.date, arr);
  });

  const isConfirmed = shifts.length > 0 && shifts.every((s) => s.is_confirmed);

  return (
    <AdminGuard>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 tracking-wide">シフト表</h1>
          <div className="w-8 h-px mt-2" style={{ background: "#d4af37" }} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); }}
            className="w-8 h-8 flex items-center justify-center rounded-md border text-gray-400 hover:text-gray-700 transition-colors"
            style={{ borderColor: "#e8dcc8" }}
          >
            ←
          </button>
          <span className="text-sm font-semibold text-gray-700 tracking-wide min-w-[100px] text-center">
            {year}年{month}月
          </span>
          <button
            onClick={() => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); }}
            className="w-8 h-8 flex items-center justify-center rounded-md border text-gray-400 hover:text-gray-700 transition-colors"
            style={{ borderColor: "#e8dcc8" }}
          >
            →
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border p-6 space-y-4" style={{ borderColor: "#e8dcc8" }}>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
              Claude API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
              style={{ borderColor: "#e8dcc8" }}
              placeholder="sk-ant-..."
            />
          </div>
          <button
            onClick={generateShift}
            disabled={generating}
            className="text-sm px-5 py-2 rounded-md font-medium text-white transition-colors disabled:opacity-50 whitespace-nowrap"
            style={{ background: "#b8960c" }}
            onMouseEnter={(e) => { if (!generating) e.currentTarget.style.background = "#c9a84c"; }}
            onMouseLeave={(e) => { if (!generating) e.currentTarget.style.background = "#b8960c"; }}
          >
            {generating ? "AI生成中..." : "AIでシフト生成"}
          </button>
          {shifts.length > 0 && !isConfirmed && (
            <button
              onClick={confirmShifts}
              className="text-sm px-5 py-2 rounded-md font-medium border transition-colors whitespace-nowrap"
              style={{ borderColor: "#b8960c", color: "#b8960c" }}
            >
              シフト確定
            </button>
          )}
          {shifts.length > 0 && (
            <button
              onClick={exportCsv}
              className="text-sm px-5 py-2 rounded-md font-medium text-gray-500 border transition-colors whitespace-nowrap hover:bg-gray-50"
              style={{ borderColor: "#e8dcc8" }}
            >
              CSV出力
            </button>
          )}
        </div>

        {error && (
          <div className="text-sm px-4 py-3 rounded-md" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}

        {notes && (
          <div className="text-sm px-4 py-3 rounded-md" style={{ background: "#f5f0e1", color: "#8a7200", border: "1px solid #e8dcc8" }}>
            <span className="font-semibold">AI判断メモ:</span> {notes}
          </div>
        )}

        {isConfirmed && (
          <div className="text-xs px-4 py-2 rounded-md font-medium tracking-wide" style={{ background: "#f5f0e1", color: "#8a7200", border: "1px solid #e8dcc8" }}>
            このシフトは確定済みです
          </div>
        )}
      </div>

      {/* Shift Calendar */}
      {shifts.length > 0 ? (
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#e8dcc8" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "#fffdf7", borderBottom: "1px solid #e8dcc8" }}>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wide w-20">日付</th>
                {SHIFT_TYPES.map((st) => (
                  <th key={st.key} className="px-3 py-3 text-left text-xs font-medium tracking-wide" style={{ color: "#b8960c" }}>
                    {st.label}
                    <span className="text-gray-400 text-[10px] ml-1 font-normal">({st.time})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((date) => {
                const dow = getDayOfWeek(date);
                const weekend = isWeekend(date);
                const isTuesday = new Date(date).getDay() === 2;
                const dayShifts = shiftsByDate.get(date) || [];
                const d = parseInt(date.split("-")[2]);

                if (isTuesday) {
                  return (
                    <tr key={date} style={{ borderBottom: "1px solid #f0ece3", background: "#f7f7f5" }}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-300">{d}({dow})</td>
                      <td colSpan={3} className="px-3 py-2 text-center text-xs text-gray-300 tracking-wide">定休日</td>
                    </tr>
                  );
                }

                return (
                  <tr key={date} style={{ borderBottom: "1px solid #f0ece3", background: weekend ? "#fffdf7" : "transparent" }}>
                    <td className={`px-3 py-2 whitespace-nowrap text-xs ${weekend ? "font-semibold" : "text-gray-600"}`}
                      style={weekend ? { color: "#c9a84c" } : {}}>
                      {d}({dow})
                    </td>
                    {SHIFT_TYPES.map((st) => {
                      const staffInShift = dayShifts.filter((s) => s.shift_type === st.key);
                      return (
                        <td key={st.key} className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {staffInShift.map((s) => (
                              <span
                                key={s.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] border"
                                style={{ background: "#f5f0e1", borderColor: "#e8dcc8", color: "#6b5c00" }}
                              >
                                {s.staff_name}
                                {s.is_owner ? (
                                  <span className="ml-1" style={{ color: "#d4af37" }}>★</span>
                                ) : null}
                                {s.experience_level === "junior" && (
                                  <span className="ml-1 text-gray-400 text-[9px]">新</span>
                                )}
                              </span>
                            ))}
                            {staffInShift.length === 0 && (
                              <span className="text-gray-300">-</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-12 text-center" style={{ borderColor: "#e8dcc8" }}>
          <p className="text-sm text-gray-400 mb-2">まだシフトが生成されていません</p>
          <p className="text-xs text-gray-300">APIキーを入力して「AIでシフト生成」を押してください</p>
        </div>
      )}

      {/* Stats */}
      {shifts.length > 0 && (
        <div className="bg-white rounded-lg border p-6" style={{ borderColor: "#e8dcc8" }}>
          <h2 className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "#b8960c" }}>
            Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const counts = new Map<string, { total: number; early: number; mid: number; late: number; isOwner: boolean }>();
              shifts.forEach((s) => {
                const key = s.staff_name;
                const c = counts.get(key) || { total: 0, early: 0, mid: 0, late: 0, isOwner: !!s.is_owner };
                c.total++;
                c[s.shift_type]++;
                counts.set(key, c);
              });
              return Array.from(counts.entries()).map(([name, c]) => (
                <div
                  key={name}
                  className="rounded-lg p-3 border"
                  style={{ background: "#fffdf7", borderColor: "#e8dcc8" }}
                >
                  <div className="text-sm font-semibold text-gray-800">
                    {name} {c.isOwner && <span style={{ color: "#d4af37" }}>★</span>}
                  </div>
                  <div className="text-lg font-semibold mt-1" style={{ color: "#b8960c" }}>
                    {c.total}<span className="text-xs text-gray-400 font-normal ml-1">回</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 tracking-wide">
                    早{c.early} / 中{c.mid} / 遅{c.late}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
    </AdminGuard>
  );
}
