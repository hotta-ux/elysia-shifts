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

const EXP_STYLES: Record<string, string> = {
  veteran: "badge-gold",
  mid: "badge-muted",
  junior: "badge-muted",
};

const PERSONALITY_OPTIONS = [
  "リーダー", "ムードメーカー", "真面目", "テキパキ",
  "丁寧", "元気", "落ち着き", "オーナー",
];

const SKILLS = [
  { key: "skill_serving", label: "接客", icon: "S" },
  { key: "skill_drink", label: "ドリンク", icon: "D" },
  { key: "skill_register", label: "レジ", icon: "R" },
  { key: "skill_close", label: "クローズ", icon: "C" },
  { key: "skill_roast", label: "ロースト", icon: "Ro" },
  { key: "skill_language", label: "外国語", icon: "L" },
  { key: "skill_cocktail", label: "カクテル", icon: "Co" },
  { key: "skill_cleaning", label: "清掃", icon: "Cl" },
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
  skill_serving: 3, skill_drink: 3, skill_register: 3, skill_close: 3,
  skill_roast: 1, skill_language: 1, skill_cocktail: 1, skill_cleaning: 3,
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

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

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
      name: s.name, experience_level: s.experience_level,
      skill_serving: s.skill_serving, skill_drink: s.skill_drink,
      skill_register: s.skill_register, skill_close: s.skill_close,
      skill_roast: s.skill_roast, skill_language: s.skill_language,
      skill_cocktail: s.skill_cocktail, skill_cleaning: s.skill_cleaning,
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
    <div className="space-y-6 animate-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="section-title">スタッフ管理</h1>
          <div className="section-line" />
        </div>
        <button
          onClick={() => { setForm(defaultForm); setEditingId(null); setShowForm(!showForm); }}
          className={showForm ? "btn-ghost" : "btn-primary"}
        >
          {showForm ? "閉じる" : "+ 新規登録"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5 animate-in">
          <h2 className="text-sm font-semibold text-gray-700 tracking-wide">
            {editingId ? "スタッフ編集" : "新規スタッフ登録"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5 tracking-wide">名前</label>
              <input
                type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all"
                style={{ borderColor: "#e8dcc8" }} required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5 tracking-wide">経験レベル</label>
              <select
                value={form.experience_level}
                onChange={(e) => setForm({ ...form, experience_level: e.target.value as "junior" | "mid" | "veteran" })}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all"
                style={{ borderColor: "#e8dcc8" }}
              >
                <option value="junior">新人</option>
                <option value="mid">中堅</option>
                <option value="veteran">ベテラン</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-3 tracking-wide">スキル（1-5）</label>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {SKILLS.map(({ key, label }) => (
                <div key={key} className="text-center">
                  <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
                  <input
                    type="range" min={1} max={5}
                    value={form[key as keyof typeof form] as number}
                    onChange={(e) => setForm({ ...form, [key]: parseInt(e.target.value) })}
                    className="w-full accent-[#b8960c] h-1"
                  />
                  <div className="text-xs font-bold mt-0.5" style={{ color: "#b8960c" }}>
                    {form[key as keyof typeof form] as number}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-2 tracking-wide">性格タグ</label>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_OPTIONS.map((tag) => (
                <button
                  key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200 ${
                    form.personality_tags.includes(tag) ? "badge-gold border-[#d4af37]" : "text-gray-400 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1.5 tracking-wide">相性メモ</label>
            <textarea
              value={form.compatibility_notes}
              onChange={(e) => setForm({ ...form, compatibility_notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all"
              style={{ borderColor: "#e8dcc8" }} rows={2}
              placeholder="例: 山田さんとは相性が良い、佐藤さんとは避ける"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5 tracking-wide">週上限日数</label>
              <input type="number" min={1} max={7} value={form.max_days_per_week}
                onChange={(e) => setForm({ ...form, max_days_per_week: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all"
                style={{ borderColor: "#e8dcc8" }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1.5 tracking-wide">連勤上限日数</label>
              <input type="number" min={1} max={7} value={form.max_consecutive_days}
                onChange={(e) => setForm({ ...form, max_consecutive_days: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all"
                style={{ borderColor: "#e8dcc8" }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-primary">{editingId ? "更新" : "登録"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(defaultForm); }} className="btn-ghost">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* Staff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staffList.map((s) => {
          const tags = JSON.parse(s.personality_tags || "[]") as string[];
          return (
            <div key={s.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={s.is_owner ? { background: "linear-gradient(135deg, #f5f0e1, #e8dcc8)", color: "#8a7200" } : { background: "#f5f5f3", color: "#999" }}>
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      {s.name}
                      {s.is_owner && <span className="text-[10px]" style={{ color: "#d4af37" }}>Owner</span>}
                    </div>
                    <span className={`${EXP_STYLES[s.experience_level]} badge mt-0.5`}>
                      {EXP_LABELS[s.experience_level]}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(s)} className="text-[11px] font-medium transition-colors" style={{ color: "#b8960c" }}>
                    編集
                  </button>
                  {!s.is_owner && (
                    <button onClick={() => handleDelete(s.id)} className="text-[11px] text-gray-300 hover:text-red-400 transition-colors">
                      削除
                    </button>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1">
                {SKILLS.filter((sk) => (s[sk.key as keyof Staff] as number) >= 3).map((sk) => {
                  const val = s[sk.key as keyof Staff] as number;
                  return (
                    <span key={sk.key} className={`badge ${val >= 4 ? "badge-gold" : "badge-muted"}`}>
                      {sk.label} {val}
                    </span>
                  );
                })}
              </div>

              {/* Tags + Meta */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span key={tag} className="badge badge-gold">{tag}</span>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">
                  週{s.max_days_per_week}日 / 連勤{s.max_consecutive_days}日
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </AdminGuard>
  );
}
