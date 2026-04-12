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
  { key: "slot1", label: "\u2460" },
  { key: "slot2", label: "\u2461" },
  { key: "slot3", label: "\u2462" },
  { key: "slot4", label: "\u2463" },
  { key: "slot5", label: "\u2464" },
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

export default function RequestsPage() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [year, setYear] = useState(nextMonth.getFullYear());
  const [month, setMonth] = useState(nextMonth.getMonth() + 1);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [requests, setRequests] = useState<Map<string, string>>(new Map());
  const [allRequests, setAllRequests] = useState<ShiftRequest[]>([]);
  const [saving, setSaving] = useState(false);
  const [csvMode, setCsvMode] = useState(false);
  const [csvText, setCsvText] = useState("");

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const days = getDaysInMonth(year, month);

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaffList(data);
  }, []);

  const fetchRequests = useCallback(async () => {
    const res = await fetch(`/api/shift-requests?month=${monthStr}`);
    const data: ShiftRequest[] = await res.json();
    setAllRequests(data);
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
    const current = requests.get(key) || "available";
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

  const handleCsvImport = async () => {
    const lines = csvText.trim().split("\n").filter(l => l.trim() && !l.startsWith("#"));
    const requestArray: { staff_id: number; date: string; shift_type: string; availability: string }[] = [];
    for (const line of lines) {
      const parts = line.split(",").map(s => s.trim());
      if (parts.length < 4) continue;
      const [staffName, date, shiftType, availability] = parts;
      const staff = staffList.find(s => s.name === staffName);
      if (!staff) continue;
      const validShifts = ["slot1", "slot2", "slot3", "slot4", "slot5"];
      const validAvail = ["available", "unavailable", "either"];
      if (!validShifts.includes(shiftType) || !validAvail.includes(availability)) continue;
      requestArray.push({ staff_id: staff.id, date, shift_type: shiftType, availability });
    }
    if (requestArray.length > 0) {
      await fetch("/api/shift-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: requestArray }),
      });
      await fetchRequests();
      setCsvText("");
      setCsvMode(false);
      alert(`${requestArray.length}件のシフト希望を取り込みました`);
    } else {
      alert("取り込み可能なデータがありませんでした");
    }
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 tracking-wide">シフト希望</h1>
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

      <div className="flex gap-3">
        <button
          onClick={() => setCsvMode(!csvMode)}
          className="text-xs px-4 py-2 rounded-md border font-medium transition-colors"
          style={{ borderColor: "#e8dcc8", color: "#b8960c" }}
        >
          {csvMode ? "閉じる" : "CSV取り込み"}
        </button>
      </div>

      {csvMode && (
        <div className="bg-white rounded-lg border p-6 space-y-3" style={{ borderColor: "#e8dcc8" }}>
          <h3 className="text-sm font-semibold text-gray-700">CSV形式で一括取り込み</h3>
          <p className="text-xs text-gray-400">
            形式: スタッフ名,日付,シフト種別(slot1/slot2/slot3/slot4/slot5),希望(available/unavailable/either)
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full border rounded-md px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1"
            style={{ borderColor: "#e8dcc8" }}
            rows={6}
            placeholder={`山田,${monthStr}-01,slot1,available\n山田,${monthStr}-01,slot2,unavailable`}
          />
          <button
            onClick={handleCsvImport}
            className="text-sm px-5 py-2 rounded-md font-medium text-white transition-colors"
            style={{ background: "#b8960c" }}
          >
            取り込み実行
          </button>
        </div>
      )}

      {/* Individual staff input */}
      <div className="bg-white rounded-lg border p-6 space-y-4" style={{ borderColor: "#e8dcc8" }}>
        <div className="flex items-center gap-4">
          <label className="text-xs font-medium text-gray-500 tracking-wide">スタッフ:</label>
          <select
            value={selectedStaff || ""}
            onChange={(e) => setSelectedStaff(Number(e.target.value) || null)}
            className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
            style={{ borderColor: "#e8dcc8" }}
          >
            <option value="">-- 選択 --</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_owner ? "(Owner)" : ""}
              </option>
            ))}
          </select>
          {selectedStaff && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm px-5 py-2 rounded-md font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: "#b8960c" }}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 tracking-wide">
          クリックで切替: ○(出勤可) → △(どちらでも) → ✕(不可)
        </p>

        {selectedStaff && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e8dcc8" }}>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wide">日付</th>
                  {SHIFT_TYPES.map((st) => (
                    <th key={st.key} className="px-2 py-2 text-center text-xs font-medium text-gray-500 tracking-wide">{st.label}</th>
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
                        <td className="px-2 py-1.5 text-xs text-gray-300">{parseInt(date.split("-")[2])}({dow})</td>
                        <td colSpan={5} className="px-2 py-1.5 text-center text-xs text-gray-300">定休日</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={date} style={{ borderBottom: "1px solid #f0ece3", background: weekend ? "#fffdf7" : "transparent" }}>
                      <td className={`px-2 py-1.5 text-xs ${weekend ? "font-semibold" : "text-gray-600"}`}
                        style={weekend ? { color: "#c9a84c" } : {}}>
                        {parseInt(date.split("-")[2])}({dow})
                      </td>
                      {SHIFT_TYPES.map((st) => {
                        const key = `${date}-${st.key}`;
                        const avail = requests.get(key) || "available";
                        return (
                          <td key={st.key} className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => toggleAvailability(date, st.key)}
                              className="w-9 h-7 rounded text-xs font-bold transition-colors"
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
        )}
      </div>

      {/* Summary view */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: "#e8dcc8" }}>
        <h2 className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "#b8960c" }}>
          Summary
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #e8dcc8" }}>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wide">日付</th>
                {SHIFT_TYPES.map((st) => (
                  <th key={st.key} className="px-2 py-2 text-left text-xs font-medium text-gray-500 tracking-wide">{st.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryByDate.map(({ date, dow, weekend, tuesday, shifts }) => {
                if (tuesday) {
                  return (
                    <tr key={date} style={{ borderBottom: "1px solid #f0ece3", background: "#f7f7f5" }}>
                      <td className="px-2 py-1 text-xs text-gray-300">{parseInt(date.split("-")[2])}({dow})</td>
                      <td colSpan={5} className="px-2 py-1 text-center text-xs text-gray-300">定休日</td>
                    </tr>
                  );
                }
                return (
                  <tr key={date} style={{ borderBottom: "1px solid #f0ece3", background: weekend ? "#fffdf7" : "transparent" }}>
                    <td className={`px-2 py-1 whitespace-nowrap text-xs ${weekend ? "font-semibold" : "text-gray-600"}`}
                      style={weekend ? { color: "#c9a84c" } : {}}>
                      {parseInt(date.split("-")[2])}({dow})
                    </td>
                    {shifts.map((st) => (
                      <td key={st.key} className="px-2 py-1">
                        {st.staff.length > 0
                          ? st.staff.map((s) => (
                              <span
                                key={s.name}
                                className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded text-[10px]"
                                style={
                                  s.availability === "available"
                                    ? { background: "#f5f0e1", color: "#8a7200" }
                                    : { background: "#f0f0f0", color: "#999" }
                                }
                              >
                                {s.name}
                              </span>
                            ))
                          : <span className="text-gray-300 text-xs">-</span>}
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
