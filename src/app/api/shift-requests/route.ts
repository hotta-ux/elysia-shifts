import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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
  return NextResponse.json(result.rows);
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
