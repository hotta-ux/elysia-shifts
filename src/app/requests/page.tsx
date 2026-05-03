"use client";

import { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";

type Staff = {
  id: number;
  name: string;
  is_owner: number;
};

type ShiftRequest = {
  staff_id: number;
  date: string;
  shift_type: string;
  availability: string;
  staff_name?: string;
};

const SHIFT_TYPES = [
  { key: "slot1", label: "①" },
  { key: "slot2", label: "②" },
  { key: "slot3", label: "③" },
  { key: "slot4", label: "④" },
  { key: "slot5", label: "⑤" },
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
  return ["日", "月", "火", "水", "木", "金", "土"][new Date(dateStr).getDay()];
}

function isWeekend(dateStr: string) {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

function isTuesday(dateStr: string) {
  return new Date(dateStr).getDay() === 2;
}

export default function RequestsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [requests, setRequests] = useState<Map<string, string>>(new Map());
  const [allRequests, setAllRequests] = useState<ShiftRequest[]>([]);
  const [saving, setSaving] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/staff");
    setStaffList(await res.json());
  }, []);

  const fetchRequests = useCallback(async () => {
    const res = await fetch(`/api/shift-requests?month=${monthStr}`);
    setAllRequests(await res.json());
  }, [monthStr]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);
  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    if (selectedStaff && allRequests.length > 0) {
      const map = new Map<string, string>();
      allRequests
        .filter((r) => r.staff_id === selectedStaff)
        .forEach((r) => map.set(`${r.date}-${r.shift_type}`, r.availability));
      setRequests(map);
    } else {
      setRequests(new Map());
    }
  }, [selectedStaff, allRequests]);

  const toggleAvailability = (date: string, shiftType: string) => {
    const key = `${date}-${shiftType}`;
    const current = requests.get(key) || "unavailable";
    const order = ["available", "either", "unavailable"];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    const newMap = new Map(requests);
    newMap.set(key, order[nextIdx]);
    setRequests(newMap);
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
    await fetchRequests();
    setSaving(false);
  };

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setYear(y); setMonth(m);
  };

  const getAvailStyle = (avail: string): React.CSSProperties => {
    if (avail === "available") return { background: "linear-gradient(135deg, #c9a20e, #b8960c)", color: "#fff" };
    if (avail === "either") return { background: "#f5f0e1", color: "#a08c2e", border: "1px solid #e8dcc8" };
    return { background: "#f0f0ee", color: "#bbb" };
  };

  const getAvailLabel = (avail: string) => {
    if (avail === "available") return "○";
    if (avail === "either") return "△";
    return "✕";
  };

  const summaryByDate = days.map((date) => {
    const dow = getDayOfWeek(date);
    const weekend = isWeekend(date);
    const tuesday = isTuesday(date);
    const byShift = SHIFT_TYPES.map((st) => {
      const staffForShift = allRequests
        .filter((r) => r.date === date && r.shift_type === st.key && r.availability !== "unavailable")
        .map((r) => ({ name: r.staff_name || "", availability: r.availability }));
      return { ...st, staff: staffForShift };
    });
    return { date, dow, weekend, tuesday, shifts: byShift };
  });

  return (
    <AdminGuard>
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="section-title">シフト希望</h1>
          <div className="section-line" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all" style={{ borderColor: "#e8dcc8" }}>‹</button>
          <span className="text-sm font-semibold text-gray-700 tracking-wide min-w-[100px] text-center">{year}年{month}月</span>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full border text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all" style={{ borderColor: "#e8dcc8" }}>›</button>
        </div>
      </div>

      {/* Individual input */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-[11px] font-medium text-gray-500 tracking-wide">スタッフ</label>
          <select
            value={selectedStaff || ""}
            onChange={(e) => setSelectedStaff(Number(e.target.value) || null)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none transition-all"
            style={{ borderColor: "#e8dcc8" }}
          >
            <option value="">-- 選択 --</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.is_owner ? "（Owner）" : ""}</option>
            ))}
          </select>
          {selectedStaff && (
            <button onClick={handleSave} disabled={saving} className="btn-primary ml-auto">
              {saving ? "保存中..." : "保存"}
            </button>
          )}
        </div>

        {selectedStaff && (
          <>
            <p className="text-[11px] text-gray-400 tracking-wide">タップで切替: ○出勤可 → △どちらでも → ✕不可</p>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-2 py-2 text-left text-[11px] font-medium text-gray-500 tracking-wider">日付</th>
                    {SHIFT_TYPES.map((st) => (
                      <th key={st.key} className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide" style={{ color: "#b8960c" }}>{st.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((date) => {
                    const dow = getDayOfWeek(date);
                    const weekend = isWeekend(date);
                    const tuesday = isTuesday(date);
                    const d = parseInt(date.split("-")[2]);
                    const isSunday = new Date(date).getDay() === 0;

                    if (tuesday) {
                      return (
                        <tr key={date} className="table-row-closed">
                          <td className="px-2 py-1 text-[11px] text-gray-300">{d}({dow})</td>
                          <td colSpan={5} className="py-1 text-center text-[10px] text-gray-300 tracking-widest">CLOSED</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={date} className={weekend ? "table-row-weekend" : "table-row"}>
                        <td className="px-2 py-1 text-[11px] whitespace-nowrap" style={isSunday ? { color: "#d4766a" } : weekend ? { color: "#c9a84c", fontWeight: 600 } : { color: "#888" }}>
                          {d}({dow})
                        </td>
                        {SHIFT_TYPES.map((st) => {
                          const key = `${date}-${st.key}`;
                          const avail = requests.get(key) || "unavailable";
                          return (
                            <td key={st.key} className="px-2 py-1 text-center">
                              <button onClick={() => toggleAvailability(date, st.key)} className="w-8 h-6 rounded-md text-[11px] font-bold transition-all duration-150 active:scale-90" style={getAvailStyle(avail)}>
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
          </>
        )}
      </div>

      {/* Summary */}
      <div className="card p-6">
        <h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#b8960c" }}>
          Summary
        </h2>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-2 py-2 text-left text-[11px] font-medium text-gray-500 tracking-wider">日付</th>
                {SHIFT_TYPES.map((st) => (
                  <th key={st.key} className="px-2 py-2 text-left text-[11px] font-semibold tracking-wide" style={{ color: "#b8960c" }}>{st.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryByDate.map(({ date, dow, weekend, tuesday, shifts }) => {
                const d = parseInt(date.split("-")[2]);
                const isSunday = new Date(date).getDay() === 0;
                if (tuesday) {
                  return (
                    <tr key={date} className="table-row-closed">
                      <td className="px-2 py-1 text-[11px] text-gray-300">{d}({dow})</td>
                      <td colSpan={5} className="py-1 text-center text-[10px] text-gray-300 tracking-widest">CLOSED</td>
                    </tr>
                  );
                }
                return (
                  <tr key={date} className={weekend ? "table-row-weekend" : "table-row"}>
                    <td className="px-2 py-1 text-[11px] whitespace-nowrap" style={isSunday ? { color: "#d4766a" } : weekend ? { color: "#c9a84c", fontWeight: 600 } : { color: "#888" }}>
                      {d}({dow})
                    </td>
                    {shifts.map((st) => (
                      <td key={st.key} className="px-2 py-1">
                        {st.staff.length > 0
                          ? st.staff.map((s) => (
                              <span key={s.name} className={`badge mr-1 mb-0.5 ${s.availability === "available" ? "badge-gold" : "badge-muted"}`}>
                                {s.name}
                              </span>
                            ))
                          : <span className="text-gray-200 text-[11px]">—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </AdminGuard>
  );
}
