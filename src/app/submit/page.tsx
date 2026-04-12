"use client";

import { useState, useEffect, useCallback } from "react";

type Staff = {
  id: number;
  name: string;
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

function isTuesday(dateStr: string) {
  return new Date(dateStr).getDay() === 2;
}

export default function SubmitPage() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [year] = useState(nextMonth.getFullYear());
  const [month] = useState(nextMonth.getMonth() + 1);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [staffName, setStaffName] = useState("");
  const [requests, setRequests] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/staff");
    const data = await res.json();
    // Only return id and name for security
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
    const current = requests.get(key) || "unavailable";
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
    requests.forEach((availability, key) => {
      const [date, shift_type] = [key.substring(0, 10), key.substring(11)];
      requestArray.push({ staff_id: selectedStaff, date, shift_type, availability });
    });
    await fetch("/api/shift-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: requestArray }),
    });
    setSaving(false);
    setSaved(true);
  };

  const getAvailStyle = (avail: string) => {
    if (avail === "available") return { background: "#b8960c", color: "#fff" };
    if (avail === "either") return { background: "#e8dcc8", color: "#8a7200" };
    return { background: "#e5e5e5", color: "#999" };
  };

  const getAvailLabel = (avail: string) => {
    if (avail === "available") return "○";
    if (avail === "either") return "△";
    return "✕";
  };

  // Staff selection screen
  if (!selectedStaff) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 tracking-wide">シフト希望提出</h1>
            <div className="w-8 h-px mx-auto mt-2" style={{ background: "#d4af37" }} />
            <p className="text-xs text-gray-400 mt-3 tracking-wide">{year}年{month}月分</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 tracking-wide">名前を選んでください</p>
            {staffList.map((s) => (
              <button
                key={s.id}
                onClick={() => selectStaff(s.id)}
                className="w-full py-3 px-4 bg-white rounded-lg border text-sm font-medium text-gray-700 hover:bg-[#fffdf7] transition-colors"
                style={{ borderColor: "#e8dcc8" }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Shift input screen
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800 tracking-wide">
            {staffName}さんのシフト希望
          </h1>
          <div className="w-8 h-px mt-1" style={{ background: "#d4af37" }} />
          <p className="text-xs text-gray-400 mt-2">{year}年{month}月</p>
        </div>
        <button
          onClick={() => { setSelectedStaff(null); setRequests(new Map()); }}
          className="text-xs text-gray-400 border rounded-md px-3 py-1.5 hover:bg-gray-50"
          style={{ borderColor: "#e8dcc8" }}
        >
          戻る
        </button>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-gray-400 tracking-wide">
        <span className="inline-block w-6 h-5 rounded text-center leading-5 text-white font-bold" style={{ background: "#b8960c" }}>○</span> 出勤可
        <span className="inline-block w-6 h-5 rounded text-center leading-5 font-bold" style={{ background: "#e8dcc8", color: "#8a7200" }}>△</span> どちらでも
        <span className="inline-block w-6 h-5 rounded text-center leading-5 font-bold" style={{ background: "#e5e5e5", color: "#999" }}>✕</span> 不可
        <span className="ml-1">← タップで切替</span>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#e8dcc8" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "#fffdf7", borderBottom: "1px solid #e8dcc8" }}>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 tracking-wide">日付</th>
              {SHIFT_TYPES.map((st) => (
                <th key={st.key} className="px-2 py-2 text-center text-xs font-medium tracking-wide" style={{ color: "#b8960c" }}>
                  <div>{st.label}</div>
                  <div className="text-[9px] text-gray-400 font-normal">{st.time}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((date) => {
              const dow = getDayOfWeek(date);
              const weekend = isWeekend(date);
              const tuesday = isTuesday(date);

              if (tuesday) {
                return (
                  <tr key={date} style={{ borderBottom: "1px solid #f0ece3", background: "#f7f7f5" }}>
                    <td className="px-3 py-1.5 text-xs text-gray-300">{parseInt(date.split("-")[2])}({dow})</td>
                    <td colSpan={3} className="px-2 py-1.5 text-center text-xs text-gray-300">定休日</td>
                  </tr>
                );
              }

              return (
                <tr key={date} style={{ borderBottom: "1px solid #f0ece3", background: weekend ? "#fffdf7" : "transparent" }}>
                  <td className={`px-3 py-1.5 text-xs ${weekend ? "font-semibold" : "text-gray-600"}`}
                    style={weekend ? { color: "#c9a84c" } : {}}>
                    {parseInt(date.split("-")[2])}({dow})
                  </td>
                  {SHIFT_TYPES.map((st) => {
                    const key = `${date}-${st.key}`;
                    const avail = requests.get(key) || "unavailable";
                    return (
                      <td key={st.key} className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => toggleAvailability(date, st.key)}
                          className="w-9 h-7 rounded text-xs font-bold transition-colors active:scale-95"
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

      <div className="sticky bottom-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 shadow-lg"
          style={{ background: saved ? "#6b7280" : "#b8960c" }}
        >
          {saving ? "送信中..." : saved ? "送信済み" : "シフト希望を送信"}
        </button>
      </div>
    </div>
  );
}
