"use client";

import { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";
import { getShiftTypes } from "@/lib/shifts";

type ShiftEntry = {
  id: number;
  staff_id: number;
  date: string;
  shift_type: string;
  staff_name: string;
  experience_level: string;
  is_owner: number;
  is_confirmed: number;
};



function getDaysInMonth(year: number, month: number) {
  const days: string[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return days;
}

function getDayOfWeek(dateStr: string) {
  return ["日", "月", "火", "水", "木", "金", "土"][new Date(dateStr).getDay()];
}

function isWeekend(dateStr: string) {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

export default function SchedulePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);
  const SHIFT_TYPES = getShiftTypes(year, month);
  const slotCount = SHIFT_TYPES.length;

  const fetchShifts = useCallback(async () => {
    const res = await fetch(`/api/shifts?month=${monthStr}`);
    setShifts(await res.json());
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
    setError(""); setNotes("");
    try {
      const res = await fetch("/api/generate-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: monthStr, apiKey }),
      });
      const text = await res.text();
      let data: { error?: string; notes?: string };
      try { data = JSON.parse(text); }
      catch { setError(`サーバー応答が不正です (HTTP ${res.status}): ${text.slice(0, 200)}`); return; }
      if (!res.ok) setError(data.error || `エラー (HTTP ${res.status})`);
      else { setNotes(data.notes || ""); await fetchShifts(); }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`通信エラー: ${msg}（タイムアウトの可能性があります）`);
    }
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
    const header = ["日付", "曜日", ...SHIFT_TYPES.map(st => `${st.label}(${st.time})`)];
    const rows = days.map((date) => {
      const dow = getDayOfWeek(date);
      const d = parseInt(date.split("-")[2]);
      const getStaff = (type: string) =>
        shifts.filter((s) => s.date === date && s.shift_type === type)
          .map((s) => `${s.staff_name}${s.is_owner ? "(Owner)" : ""}`)
          .join(" / ") || "-";
      return [`${d}`, dow, ...SHIFT_TYPES.map(st => getStaff(st.key))];
    });
    const bom = "﻿";
    const csv = bom + [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shift_${year}_${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setYear(y); setMonth(m);
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
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="section-title">シフト表</h1>
          <div className="section-line" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all" style={{ borderColor: "#e8dcc8" }}>‹</button>
          <span className="text-sm font-semibold text-gray-700 tracking-wide min-w-[100px] text-center">{year}年{month}月</span>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all" style={{ borderColor: "#e8dcc8" }}>›</button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5 tracking-wide">Claude API Key</label>
            <input
              type="password" value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all"
              style={{ borderColor: "#e8dcc8" }}
              placeholder="sk-ant-..."
            />
          </div>
          <button onClick={generateShift} disabled={generating} className="btn-primary whitespace-nowrap">
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                生成中...
              </span>
            ) : "AIで生成"}
          </button>
          {shifts.length > 0 && !isConfirmed && (
            <button onClick={confirmShifts} className="btn-outline whitespace-nowrap">確定</button>
          )}
          {shifts.length > 0 && (
            <button onClick={exportCsv} className="btn-ghost whitespace-nowrap">CSV出力</button>
          )}
        </div>

        {error && (
          <div className="text-sm px-4 py-3 rounded-lg animate-in" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}

        {notes && (
          <div className="text-sm px-4 py-3 rounded-lg animate-in" style={{ background: "#f5f0e1", color: "#6b5c00", border: "1px solid #e8dcc8" }}>
            <span className="font-semibold">AI判断メモ：</span> {notes}
          </div>
        )}

        {isConfirmed && (
          <div className="text-xs px-4 py-2 rounded-lg font-medium tracking-wide flex items-center gap-1.5" style={{ background: "#f5f0e1", color: "#8a7200" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            確定済み
          </div>
        )}
      </div>

      {shifts.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-medium text-gray-500 tracking-wider w-20">日付</th>
                {SHIFT_TYPES.map((st) => (
                  <th key={st.key} className="px-3 py-3 text-left text-[11px] font-semibold tracking-wide" style={{ color: "#b8960c" }}>
                    <span className="text-sm">{st.label}</span>
                    <span className="text-gray-400 text-[10px] ml-1 font-normal">{st.time}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((date) => {
                const dow = getDayOfWeek(date);
                const weekend = isWeekend(date);
                const isSunday = new Date(date).getDay() === 0;
                const dayShifts = shiftsByDate.get(date) || [];
                const d = parseInt(date.split("-")[2]);
return (
                  <tr key={date} className={weekend ? "table-row-weekend" : "table-row"}>
                    <td className="px-3 py-2 whitespace-nowrap text-[11px]" style={isSunday ? { color: "#d4766a" } : weekend ? { color: "#c9a84c", fontWeight: 600 } : { color: "#888" }}>
                      {d}({dow})
                    </td>
                    {SHIFT_TYPES.map((st) => {
                      const staffInShift = dayShifts.filter((s) => s.shift_type === st.key);
                      return (
                        <td key={st.key} className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {staffInShift.length > 0 ? staffInShift.map((s) => (
                              <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "#fffdf7", border: "1px solid #e8dcc8", color: "#6b5c00" }}>
                                {s.staff_name}
                                {s.is_owner ? <span className="ml-1" style={{ color: "#d4af37" }}>★</span> : null}
                                {s.experience_level === "junior" && <span className="ml-1 text-gray-400 text-[9px]">新</span>}
                              </span>
                            )) : <span className="text-gray-200">—</span>}
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
        <div className="card p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: "#f5f0e1" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b8960c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p className="text-sm text-gray-500 mb-1">まだシフトが生成されていません</p>
          <p className="text-xs text-gray-400">APIキーを入力して「AIで生成」を押してください</p>
        </div>
      )}

      {shifts.length > 0 && (
        <div className="card p-6">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#b8960c" }}>
            Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(() => {
              const counts = new Map<string, { total: number; perSlot: Record<string, number>; isOwner: boolean }>();
              shifts.forEach((s) => {
                const key = s.staff_name;
                const cur = counts.get(key) || { total: 0, perSlot: {}, isOwner: !!s.is_owner };
                cur.total++;
                cur.perSlot[s.shift_type] = (cur.perSlot[s.shift_type] || 0) + 1;
                counts.set(key, cur);
              });
              return Array.from(counts.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .map(([name, c]) => (
                <div key={name} className="rounded-xl p-3.5 border transition-all hover:shadow-sm" style={{ background: "linear-gradient(180deg, #fffdf7 0%, #fdfaf3 100%)", borderColor: "#e8dcc8" }}>
                  <div className="text-[13px] font-semibold text-gray-800">
                    {name} {c.isOwner && <span style={{ color: "#d4af37" }}>★</span>}
                  </div>
                  <div className="text-2xl font-bold mt-1.5" style={{ color: "#b8960c" }}>
                    {c.total}<span className="text-[11px] text-gray-400 font-normal ml-1">回</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 tracking-wide font-mono">
                    {SHIFT_TYPES.map(st => `${st.label}${c.perSlot[st.key] || 0}`).join(" ")}
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
