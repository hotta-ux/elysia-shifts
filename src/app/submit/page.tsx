"use client";

import { useState, useEffect, useCallback } from "react";

import { getShiftTypes } from "@/lib/shifts";

type Staff = {
  id: number;
  name: string;
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
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[new Date(dateStr).getDay()];
}

function isWeekend(dateStr: string) {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}


export default function SubmitPage() {
  const now = new Date();
  // Default to current month (e.g. May 2026 if today is in May)
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setYear(y);
    setMonth(m);
    setSaved(false);
  };
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [staffName, setStaffName] = useState("");
  const [requests, setRequests] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);
  const SHIFT_TYPES = getShiftTypes(year, month);
  const slotCount = SHIFT_TYPES.length;
  // 堀田 (owner) defaults to 'available' for every slot; others default to 'unavailable'.
  const defaultAvail = staffName === "堀田" ? "available" : "unavailable";

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaffList(data.map((s: Staff & Record<string, unknown>) => ({ id: s.id, name: s.name })));
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const fetchMyRequests = useCallback(async () => {
    if (!selectedStaff) return;
    const res = await fetch(`/api/shift-requests?month=${monthStr}`);
    const data = await res.json();
    const map = new Map<string, string>();
    data
      .filter((r: { staff_id: number }) => r.staff_id === selectedStaff)
      .forEach((r: { date: string; shift_type: string; availability: string }) =>
        map.set(`${r.date}-${r.shift_type}`, r.availability)
      );
    setRequests(map);
  }, [selectedStaff, monthStr]);

  useEffect(() => { fetchMyRequests(); }, [fetchMyRequests]);

  const selectStaff = (id: number) => {
    setSelectedStaff(id);
    const s = staffList.find(st => st.id === id);
    setStaffName(s?.name || "");
    setSaved(false);
  };

  const toggleAvailability = (date: string, shiftType: string) => {
    const key = `${date}-${shiftType}`;
    const current = requests.get(key) || defaultAvail;
    const order = ["available", "either", "unavailable"];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const newMap = new Map(requests);
    newMap.set(key, order[nextIdx]);
    setRequests(newMap);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedStaff) return;
    setSaving(true);
    const requestArray: { staff_id: number; date: string; shift_type: string; availability: string }[] = [];
    // For 堀田: fill every day/slot with defaultAvail (= "available") if not explicitly tapped.
    // For others: only save tapped slots.
    if (defaultAvail === "available") {
      for (const date of days) {
        for (const st of SHIFT_TYPES) {
          const key = `${date}-${st.key}`;
          // Break slots default to unavailable for 堀田 unless explicitly toggled
          const availability = requests.get(key) || (st.isBreak ? "unavailable" : defaultAvail);
          requestArray.push({ staff_id: selectedStaff, date, shift_type: st.key, availability });
        }
      }
    } else {
      requests.forEach((availability, key) => {
        const [date, shift_type] = [key.substring(0, 10), key.substring(11)];
        requestArray.push({ staff_id: selectedStaff, date, shift_type, availability });
      });
    }
    await fetch("/api/shift-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: requestArray }),
    });
    setSaving(false);
    setSaved(true);
  };

  const getAvailStyle = (avail: string): React.CSSProperties => {
    if (avail === "available") return { background: "linear-gradient(135deg, #c9a20e, #b8960c)", color: "#fff", boxShadow: "0 1px 2px rgba(184,150,12,0.2)" };
    if (avail === "either") return { background: "#f5f0e1", color: "#a08c2e", border: "1px solid #e8dcc8" };
    return { background: "#f0f0ee", color: "#bbb" };
  };

  const getAvailLabel = (avail: string) => {
    if (avail === "available") return "\u25CB";
    if (avail === "either") return "\u25B3";
    return "\u2715";
  };

  // Staff selection
  if (!selectedStaff) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center animate-in">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div>
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f5f0e1 0%, #e8dcc8 100%)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b8960c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h1 className="section-title">シフト希望提出</h1>
            <div className="section-line mx-auto" />
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => changeMonth(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
              style={{ borderColor: "#e8dcc8" }}
              aria-label="前月"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-700 tracking-wide min-w-[110px] text-center">
              {year}年{month}月分
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
              style={{ borderColor: "#e8dcc8" }}
              aria-label="次月"
            >
              ›
            </button>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs text-gray-400 tracking-wide mb-3">名前を選んでください</p>
            {staffList.map((s) => (
              <button
                key={s.id}
                onClick={() => selectStaff(s.id)}
                className="card w-full py-3.5 px-5 text-sm font-medium text-gray-700 transition-all duration-200 hover:translate-y-[-1px] active:translate-y-0 text-left flex items-center justify-between group"
              >
                <span>{s.name}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-gray-500 transition-colors">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Shift input
  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-800 tracking-wide">
            {staffName}
            <span className="text-gray-400 font-normal ml-1">のシフト</span>
          </h1>
          <div className="section-line" />
        </div>
        <button
          onClick={() => { setSelectedStaff(null); setRequests(new Map()); }}
          className="btn-ghost text-xs !py-1.5 !px-3"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          戻る
        </button>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => changeMonth(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
          style={{ borderColor: "#e8dcc8" }}
          aria-label="前月"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-700 tracking-wide min-w-[110px] text-center">
          {year}年{month}月
        </span>
        <button
          onClick={() => changeMonth(1)}
          className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
          style={{ borderColor: "#e8dcc8" }}
          aria-label="次月"
        >
          ›
        </button>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-gray-400 tracking-wide bg-white/60 rounded-lg px-3 py-2">
        <span className="inline-flex w-6 h-5 rounded items-center justify-center text-white text-[10px] font-bold" style={{ background: "linear-gradient(135deg, #c9a20e, #b8960c)" }}>{"\u25CB"}</span>
        <span>出勤可</span>
        <span className="inline-flex w-6 h-5 rounded items-center justify-center text-[10px] font-bold" style={{ background: "#f5f0e1", color: "#a08c2e" }}>{"\u25B3"}</span>
        <span>どちらでも</span>
        <span className="inline-flex w-6 h-5 rounded items-center justify-center text-[10px] font-bold" style={{ background: "#f0f0ee", color: "#bbb" }}>{"\u2715"}</span>
        <span>不可</span>
        <span className="ml-auto text-gray-300">タップで切替</span>
      </div>

      <div className="card overflow-hidden !rounded-xl">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 tracking-wider w-16">日付</th>
              {SHIFT_TYPES.map((st) => (
                <th key={st.key} className="px-1 py-2.5 text-center text-[11px] font-semibold tracking-wide" style={{ color: st.isBreak ? "#bbb" : "#b8960c" }}>
                  <div className="leading-none">{st.label}</div>
                  <div className="text-[8px] text-gray-400 font-normal mt-0.5">{st.isBreak ? "休憩" : st.time}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((date) => {
              const dow = getDayOfWeek(date);
              const weekend = isWeekend(date);
              const d = parseInt(date.split("-")[2]);
              const isSunday = new Date(date).getDay() === 0;
return (
                <tr key={date} className={weekend ? "table-row-weekend" : "table-row"}>
                  <td className="px-3 py-1 text-[11px] whitespace-nowrap" style={isSunday ? { color: "#d4766a" } : weekend ? { color: "#c9a84c", fontWeight: 600 } : { color: "#888" }}>
                    {d}<span className="ml-0.5">({dow})</span>
                  </td>
                  {SHIFT_TYPES.map((st) => {
                    const key = `${date}-${st.key}`;
                    const avail = requests.get(key) || (st.isBreak ? "unavailable" : defaultAvail);
                    return (
                      <td key={st.key} className="px-1 py-1 text-center" style={st.isBreak ? { background: "#f5f5f3" } : undefined}>
                        <button
                          onClick={() => toggleAvailability(date, st.key)}
                          className="w-8 h-6 rounded-md text-[11px] font-bold transition-all duration-150 active:scale-90"
                          style={getAvailStyle(avail)}
                        >
                          {getAvailLabel(avail)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-4 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3.5 rounded-xl text-sm font-medium text-white transition-all duration-200 shadow-lg ${
            saved ? "!bg-gray-400 shadow-none" : ""
          }`}
          style={saved ? {} : { background: "linear-gradient(135deg, #c9a20e 0%, #b8960c 100%)", boxShadow: "0 4px 14px rgba(184,150,12,0.3)" }}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              送信中...
            </span>
          ) : saved ? (
            <span className="flex items-center justify-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              送信済み
            </span>
          ) : "シフト希望を送信"}
        </button>
      </div>
    </div>
  );
}
