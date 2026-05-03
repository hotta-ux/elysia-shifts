"use client";

import { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";

type Staff = {
  id: number;
  name: string;
  is_owner: number;
  grade: string;
  hire_date: string;
  hourly_wage: number;
  skill_serving: number;
  skill_drink: number;
  skill_register: number;
  skill_close: number;
  skill_roast: number;
  skill_language: number;
  skill_cocktail: number;
  skill_cleaning: number;
};

type Evaluation = {
  id: number;
  staff_id: number;
  staff_name: string;
  period: string;
  barista_skill: number;
  bean_sales: number;
  bean_sales_score: number;
  shift_contribution: number;
  attitude: number;
  tenure_score: number;
  total_score: number;
  grade: string;
  created_at: string;
};

const GRADE_NAMES: Record<string, string> = {
  G1: "Rookie",
  G2: "Regular",
  G3: "Ace",
  G4: "Star",
  G5: "Hero",
  G6: "Legend",
};

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  G1: { bg: "#f7f7f7", text: "#aaa" },
  G2: { bg: "#f0f0f0", text: "#666" },
  G3: { bg: "#f5f0e1", text: "#8a7200" },
  G4: { bg: "#fff3cd", text: "#856404" },
  G5: { bg: "#fde8c8", text: "#b45309" },
  G6: { bg: "#f0e4ff", text: "#6b21a8" },
};

const GRADE_WAGES: Record<string, string> = {
  G1: "ベース",
  G2: "+30円",
  G3: "+60円",
  G4: "+100円",
  G5: "+150円",
  G6: "+200円",
};

export default function RaisePage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<number | "">("");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [beanSalesAmount, setBeanSalesAmount] = useState(0);
  const [shiftContribution, setShiftContribution] = useState(3);
  const [attitude, setAttitude] = useState(3);

  const fetchData = useCallback(async () => {
    const [staffRes, evalRes] = await Promise.all([
      fetch("/api/staff"),
      fetch("/api/evaluations"),
    ]);
    setStaffList(await staffRes.json());
    const evalData = await evalRes.json();
    setEvaluations(evalData.evaluations || []);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_id: selectedStaff,
        period,
        bean_sales_amount: beanSalesAmount,
        shift_contribution: shiftContribution,
        attitude,
      }),
    });

    setShowForm(false);
    setSelectedStaff("");
    setBeanSalesAmount(0);
    setShiftContribution(3);
    setAttitude(3);
    fetchData();
  };

  const skillAvg = (s: Staff) => {
    const avg =
      (s.skill_serving +
        s.skill_drink +
        s.skill_register +
        s.skill_close +
        s.skill_roast +
        s.skill_language +
        s.skill_cocktail +
        s.skill_cleaning) /
      8;
    return Math.round(avg * 10) / 10;
  };

  const selectedStaffData = staffList.find((s) => s.id === selectedStaff);

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 tracking-wide">
              昇給管理
            </h1>
            <div
              className="w-8 h-px mt-2"
              style={{ background: "#d4af37" }}
            />
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm px-5 py-2 rounded-md font-medium text-white transition-colors"
            style={{ background: "#b8960c" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#c9a84c")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#b8960c")
            }
          >
            {showForm ? "閉じる" : "新規評価"}
          </button>
        </div>

        {/* Grade legend */}
        <div
          className="bg-white rounded-lg border p-4"
          style={{ borderColor: "#e8dcc8" }}
        >
          <h2 className="text-xs font-medium text-gray-500 mb-3 tracking-wide">
            等級一覧
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(GRADE_NAMES).map(([key, name]) => {
              const colors = GRADE_COLORS[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  <span className="font-bold">{key}</span>
                  <span>{name}</span>
                  <span className="opacity-60">{GRADE_WAGES[key]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff grade overview */}
        <div
          className="bg-white rounded-lg border overflow-hidden"
          style={{ borderColor: "#e8dcc8" }}
        >
          <table className="w-full">
            <thead
              style={{
                background: "#fffdf7",
                borderBottom: "1px solid #e8dcc8",
              }}
            >
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wide">
                  名前
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 tracking-wide">
                  等級
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 tracking-wide">
                  バリスタスキル
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 tracking-wide">
                  入社日
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 tracking-wide">
                  時給加算
                </th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s, i) => {
                const grade = s.grade || "G1";
                const colors = GRADE_COLORS[grade] || GRADE_COLORS.G1;
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-[#fffdf7] transition-colors"
                    style={{
                      borderBottom:
                        i < staffList.length - 1
                          ? "1px solid #f0ece3"
                          : "none",
                    }}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {s.name}
                      {s.is_owner ? (
                        <span
                          className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: "#f5f0e1",
                            color: "#8a7200",
                          }}
                        >
                          Owner
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="text-xs px-3 py-1 rounded-full font-bold"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {grade} {GRADE_NAMES[grade]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-600">
                        {skillAvg(s)}{" "}
                        <span className="text-xs text-gray-400">/ 5.0</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">
                      {s.hire_date || "未設定"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="text-sm font-medium"
                        style={{ color: "#b8960c" }}
                      >
                        {GRADE_WAGES[grade]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Evaluation form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg border p-6 space-y-5"
            style={{ borderColor: "#e8dcc8" }}
          >
            <h2 className="text-sm font-semibold text-gray-700 tracking-wide">
              新規評価（50点満点）
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
                  スタッフ
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) =>
                    setSelectedStaff(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: "#e8dcc8" }}
                  required
                >
                  <option value="">選択してください</option>
                  {staffList
                    .filter((s) => !s.is_owner)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
                  評価期間
                </label>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: "#e8dcc8" }}
                  required
                />
              </div>
            </div>

            {/* Auto-calculated barista skill display */}
            {selectedStaffData && (
              <div
                className="rounded-md p-4"
                style={{ background: "#fffdf7", border: "1px solid #e8dcc8" }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">
                    バリスタスキル（自動算出）
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: "#b8960c" }}
                  >
                    {Math.round(skillAvg(selectedStaffData) * 3 * 10) / 10}
                    <span className="text-xs text-gray-400 ml-1">/ 15</span>
                  </span>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[
                    { label: "接客", val: selectedStaffData.skill_serving },
                    { label: "飲料", val: selectedStaffData.skill_drink },
                    { label: "レジ", val: selectedStaffData.skill_register },
                    { label: "閉店", val: selectedStaffData.skill_close },
                    { label: "焙煎", val: selectedStaffData.skill_roast },
                    { label: "語学", val: selectedStaffData.skill_language },
                    { label: "夜", val: selectedStaffData.skill_cocktail },
                    { label: "清掃", val: selectedStaffData.skill_cleaning },
                  ].map((sk) => (
                    <span
                      key={sk.label}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={
                        sk.val >= 4
                          ? { background: "#f5f0e1", color: "#8a7200" }
                          : sk.val >= 3
                          ? { background: "#f0f0f0", color: "#999" }
                          : { background: "#f7f7f7", color: "#ccc" }
                      }
                    >
                      {sk.label}
                      {sk.val}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
                豆販売 月間売上（円）→ 10点満点
              </label>
              <input
                type="number"
                value={beanSalesAmount}
                onChange={(e) => setBeanSalesAmount(Number(e.target.value))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: "#e8dcc8" }}
                min={0}
                step={1000}
                placeholder="例: 150000"
              />
              <div className="text-xs text-gray-400 mt-1">
                〜5万→2点 / 〜15万→4点 / 〜30万→6点 / 〜50万→8点 / 50万〜→10点
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
                シフト貢献度（5点満点）
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={shiftContribution}
                  onChange={(e) =>
                    setShiftContribution(Number(e.target.value))
                  }
                  className="flex-1 accent-[#b8960c]"
                />
                <span
                  className="text-lg font-bold w-8 text-center"
                  style={{ color: "#b8960c" }}
                >
                  {shiftContribution}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                土日出勤・代打対応・出勤率
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
                勤務態度（5点満点）
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={attitude}
                  onChange={(e) => setAttitude(Number(e.target.value))}
                  className="flex-1 accent-[#b8960c]"
                />
                <span
                  className="text-lg font-bold w-8 text-center"
                  style={{ color: "#b8960c" }}
                >
                  {attitude}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                遅刻なし・報連相・自主性
              </div>
            </div>

            {/* Tenure auto display */}
            {selectedStaffData && (
              <div
                className="rounded-md p-4"
                style={{ background: "#fffdf7", border: "1px solid #e8dcc8" }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">
                    勤続（自動算出）
                  </span>
                  <span className="text-sm text-gray-600">
                    入社日: {selectedStaffData.hire_date || "未設定"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="text-sm px-6 py-2 rounded-md font-medium text-white transition-colors"
                style={{ background: "#b8960c" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#c9a84c")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#b8960c")
                }
              >
                評価を保存
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm px-6 py-2 rounded-md font-medium border text-gray-500 hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#e8dcc8" }}
              >
                キャンセル
              </button>
            </div>
          </form>
        )}

        {/* Evaluation history */}
        {evaluations.length > 0 && (
          <div
            className="bg-white rounded-lg border overflow-hidden"
            style={{ borderColor: "#e8dcc8" }}
          >
            <div
              className="px-4 py-3"
              style={{
                background: "#fffdf7",
                borderBottom: "1px solid #e8dcc8",
              }}
            >
              <h2 className="text-xs font-medium text-gray-500 tracking-wide">
                評価履歴
              </h2>
            </div>
            <table className="w-full">
              <thead
                style={{
                  background: "#fffdf7",
                  borderBottom: "1px solid #e8dcc8",
                }}
              >
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-400 tracking-wide">
                    期間
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-400 tracking-wide">
                    名前
                  </th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-gray-400 tracking-wide">
                    スキル/15
                  </th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-gray-400 tracking-wide">
                    豆販売/10
                  </th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-gray-400 tracking-wide">
                    シフト/5
                  </th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-gray-400 tracking-wide">
                    態度/5
                  </th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-gray-400 tracking-wide">
                    勤続/10
                  </th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-gray-400 tracking-wide">
                    合計/50
                  </th>
                  <th className="px-4 py-2 text-center text-[10px] font-medium text-gray-400 tracking-wide">
                    等級
                  </th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev, i) => {
                  const colors =
                    GRADE_COLORS[ev.grade] || GRADE_COLORS.G1;
                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-[#fffdf7] transition-colors"
                      style={{
                        borderBottom:
                          i < evaluations.length - 1
                            ? "1px solid #f0ece3"
                            : "none",
                      }}
                    >
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {ev.period}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-800">
                        {ev.staff_name}
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-600">
                        {ev.barista_skill}
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-600">
                        {ev.bean_sales_score}
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({(ev.bean_sales / 10000).toFixed(1)}万)
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-600">
                        {ev.shift_contribution}
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-600">
                        {ev.attitude}
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-600">
                        {ev.tenure_score}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className="text-sm font-bold"
                          style={{ color: "#b8960c" }}
                        >
                          {ev.total_score}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{
                            background: colors.bg,
                            color: colors.text,
                          }}
                        >
                          {ev.grade} {GRADE_NAMES[ev.grade]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
