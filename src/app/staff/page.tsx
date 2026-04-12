"use client";

import { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";

type Staff = {
  id: number;
  name: string;
  is_owner: number;
  experience_level: "junior" | "mid" | "veteran";
  skill_serving: number;
  skill_drink: number;
  skill_register: number;
  skill_close: number;
  skill_roast: number;
  skill_language: number;
  skill_cocktail: number;
  skill_cleaning: number;
  personality_tags: string;
  compatibility_notes: string;
  max_days_per_week: number;
  max_consecutive_days: number;
};

const EXP_LABELS: Record<string, string> = {
  junior: "新人",
  mid: "中堅",
  veteran: "ベテラン",
};

const PERSONALITY_OPTIONS = [
  "リーダー",
  "ムードメーカー",
  "真面目",
  "テキパキ",
  "丁寧",
  "元気",
  "落ち着き",
  "オーナー",
];

const defaultForm: {
  name: string;
  experience_level: "junior" | "mid" | "veteran";
  skill_serving: number;
  skill_drink: number;
  skill_register: number;
  skill_close: number;
  skill_roast: number;
  skill_language: number;
  skill_cocktail: number;
  skill_cleaning: number;
  personality_tags: string[];
  compatibility_notes: string;
  max_days_per_week: number;
  max_consecutive_days: number;
} = {
  name: "",
  experience_level: "junior",
  skill_serving: 3,
  skill_drink: 3,
  skill_register: 3,
  skill_close: 3,
  skill_roast: 1,
  skill_language: 1,
  skill_cocktail: 1,
  skill_cleaning: 3,
  personality_tags: [],
  compatibility_notes: "",
  max_days_per_week: 5,
  max_consecutive_days: 5,
};

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchStaff = useCallback(async () => {
    const res = await fetch("/api/staff");
    setStaffList(await res.json());
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/staff/${editingId}` : "/api/staff";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm(defaultForm);
    setEditingId(null);
    setShowForm(false);
    fetchStaff();
  };

  const handleEdit = (s: Staff) => {
    setForm({
      name: s.name,
      experience_level: s.experience_level,
      skill_serving: s.skill_serving,
      skill_drink: s.skill_drink,
      skill_register: s.skill_register,
      skill_close: s.skill_close,
      skill_roast: s.skill_roast,
      skill_language: s.skill_language,
      skill_cocktail: s.skill_cocktail,
      skill_cleaning: s.skill_cleaning,
      personality_tags: JSON.parse(s.personality_tags || "[]"),
      compatibility_notes: s.compatibility_notes,
      max_days_per_week: s.max_days_per_week,
      max_consecutive_days: s.max_consecutive_days,
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このスタッフを削除しますか？")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    fetchStaff();
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      personality_tags: prev.personality_tags.includes(tag)
        ? prev.personality_tags.filter((t) => t !== tag)
        : [...prev.personality_tags, tag],
    }));
  };

  return (
    <AdminGuard>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 tracking-wide">スタッフ管理</h1>
          <div className="w-8 h-px mt-2" style={{ background: "#d4af37" }} />
        </div>
        <button
          onClick={() => {
            setForm(defaultForm);
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="text-sm px-5 py-2 rounded-md font-medium text-white transition-colors"
          style={{ background: "#b8960c" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#c9a84c")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#b8960c")}
        >
          {showForm ? "閉じる" : "新規登録"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border p-6 space-y-5"
          style={{ borderColor: "#e8dcc8" }}
        >
          <h2 className="text-sm font-semibold text-gray-700 tracking-wide">
            {editingId ? "スタッフ編集" : "新規スタッフ登録"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
                名前
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: "#e8dcc8", }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
                経験レベル
              </label>
              <select
                value={form.experience_level}
                onChange={(e) =>
                  setForm({
                    ...form,
                    experience_level: e.target.value as "junior" | "mid" | "veteran",
                  })
                }
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: "#e8dcc8" }}
              >
                <option value="junior">新人</option>
                <option value="mid">中堅</option>
                <option value="veteran">ベテラン</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-3 tracking-wide">
              スキル（1-5）
            </label>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
              {[
                { key: "skill_serving", label: "接客" },
                { key: "skill_drink", label: "ドリンク" },
                { key: "skill_register", label: "レジ" },
                { key: "skill_close", label: "クローズ" },
                { key: "skill_roast", label: "ロースト" },
                { key: "skill_language", label: "外国語" },
                { key: "skill_cocktail", label: "カクテル" },
                { key: "skill_cleaning", label: "清掃" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500">{label}</label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={form[key as keyof typeof form] as number}
                    onChange={(e) =>
                      setForm({ ...form, [key]: parseInt(e.target.value) })
                    }
                    className="w-full accent-[#b8960c]"
                  />
                  <div className="text-center text-sm font-semibold" style={{ color: "#b8960c" }}>
                    {form[key as keyof typeof form] as number}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2 tracking-wide">
              性格タグ
            </label>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1 rounded-full text-xs border transition-colors"
                  style={
                    form.personality_tags.includes(tag)
                      ? { background: "#f5f0e1", borderColor: "#d4af37", color: "#8a7200" }
                      : { background: "#fafaf8", borderColor: "#e5e5e5", color: "#999" }
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
              相性メモ
            </label>
            <textarea
              value={form.compatibility_notes}
              onChange={(e) =>
                setForm({ ...form, compatibility_notes: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
              style={{ borderColor: "#e8dcc8" }}
              rows={2}
              placeholder="例: 山田さんとは相性が良い、佐藤さんとは避ける"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
                週の上限日数
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={form.max_days_per_week}
                onChange={(e) =>
                  setForm({ ...form, max_days_per_week: parseInt(e.target.value) })
                }
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: "#e8dcc8" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 tracking-wide">
                連勤上限日数
              </label>
              <input
                type="number"
                min={1}
                max={7}
                value={form.max_consecutive_days}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_consecutive_days: parseInt(e.target.value),
                  })
                }
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ borderColor: "#e8dcc8" }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="text-sm px-6 py-2 rounded-md font-medium text-white transition-colors"
              style={{ background: "#b8960c" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#c9a84c")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#b8960c")}
            >
              {editingId ? "更新" : "登録"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(defaultForm);
              }}
              className="text-sm px-6 py-2 rounded-md font-medium border text-gray-500 hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#e8dcc8" }}
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      <div
        className="bg-white rounded-lg border overflow-hidden"
        style={{ borderColor: "#e8dcc8" }}
      >
        <table className="w-full">
          <thead style={{ background: "#fffdf7", borderBottom: "1px solid #e8dcc8" }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wide">名前</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wide">レベル</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wide">スキル</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wide">性格</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 tracking-wide">週上限</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 tracking-wide">操作</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((s, i) => {
              const tags = JSON.parse(s.personality_tags || "[]");
              return (
                <tr
                  key={s.id}
                  className="hover:bg-[#fffdf7] transition-colors"
                  style={{ borderBottom: i < staffList.length - 1 ? "1px solid #f0ece3" : "none" }}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {s.name}
                    {s.is_owner ? (
                      <span
                        className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "#f5f0e1", color: "#8a7200" }}
                      >
                        Owner
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={
                        s.experience_level === "veteran"
                          ? { background: "#f5f0e1", color: "#8a7200" }
                          : s.experience_level === "mid"
                          ? { background: "#f0f0f0", color: "#666" }
                          : { background: "#f7f7f7", color: "#aaa" }
                      }
                    >
                      {EXP_LABELS[s.experience_level]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: "接客", val: s.skill_serving },
                        { label: "飲料", val: s.skill_drink },
                        { label: "レジ", val: s.skill_register },
                        { label: "閉店", val: s.skill_close },
                        { label: "焙煎", val: s.skill_roast },
                        { label: "語学", val: s.skill_language },
                        { label: "夜", val: s.skill_cocktail },
                        { label: "清掃", val: s.skill_cleaning },
                      ].filter(sk => sk.val >= 3).map(sk => (
                        <span
                          key={sk.label}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={
                            sk.val >= 4
                              ? { background: "#f5f0e1", color: "#8a7200" }
                              : { background: "#f0f0f0", color: "#999" }
                          }
                        >
                          {sk.label}{sk.val}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "#f5f0e1", color: "#8a7200" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">
                    {s.max_days_per_week}日
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => handleEdit(s)}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "#b8960c" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#8a7200")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#b8960c")}
                    >
                      編集
                    </button>
                    {!s.is_owner && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </AdminGuard>
  );
}
