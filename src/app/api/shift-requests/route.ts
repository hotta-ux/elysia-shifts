import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getShiftTypesForMonth } from '@/lib/shifts';

type RequestRow = {
  id: number | null;
  staff_id: number;
  date: string;
  shift_type: string;
  availability: string;
  staff_name: string;
  created_at?: string | null;
};

function getDaysInMonth(monthStr: string): string[] {
  const [y, m] = monthStr.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    out.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const db = await getDb();

  let sql = `
    SELECT sr.*, s.name as staff_name
    FROM shift_requests sr
    JOIN staff s ON sr.staff_id = s.id
  `;
  const args: string[] = [];

  if (month) {
    sql += ` WHERE sr.date LIKE ?`;
    args.push(`${month}%`);
  }

  sql += ' ORDER BY sr.date, sr.shift_type, s.name';
  const result = await db.execute({ sql, args });
  const rows = result.rows as unknown as RequestRow[];

  // Auto-fill 堀田 (owner) availability: any slot 堀田 hasn't explicitly set
  // is treated as 'available'. Explicit ✕ submissions are preserved.
  if (month) {
    const hottaResult = await db.execute("SELECT id, name FROM staff WHERE name = '堀田' LIMIT 1");
    const hotta = hottaResult.rows[0] as { id: number; name: string } | undefined;
    if (hotta) {
      const explicit = new Set(
        rows
          .filter((r) => r.staff_id === hotta.id)
          .map((r) => `${r.date}-${r.shift_type}`)
      );
      const shiftTypes = getShiftTypesForMonth(month);
      const days = getDaysInMonth(month);
      for (const date of days) {
        for (const st of shiftTypes) {
          if (!explicit.has(`${date}-${st.key}`)) {
            rows.push({
              id: null,
              staff_id: hotta.id,
              date,
              shift_type: st.key,
              availability: 'available',
              staff_name: hotta.name,
              created_at: null,
            });
          }
        }
      }
      rows.sort((a, b) => a.date.localeCompare(b.date) || a.shift_type.localeCompare(b.shift_type) || a.staff_name.localeCompare(b.staff_name));
    }
  }

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();

  const stmts = body.requests.map((r: { staff_id: number; date: string; shift_type: string; availability: string }) => ({
    sql: `INSERT INTO shift_requests (staff_id, date, shift_type, availability)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(staff_id, date, shift_type) DO UPDATE SET availability = ?`,
    args: [r.staff_id, r.date, r.shift_type, r.availability, r.availability],
  }));

  await db.batch(stmts, 'write');
  return NextResponse.json({ success: true, count: body.requests.length });
}
