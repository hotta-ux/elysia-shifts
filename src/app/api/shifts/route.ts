import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const db = await getDb();

  let sql = `
    SELECT sh.*, s.name as staff_name, s.experience_level, s.is_owner
    FROM shifts sh
    JOIN staff s ON sh.staff_id = s.id
  `;
  const args: string[] = [];

  if (month) {
    sql += ` WHERE sh.date LIKE ?`;
    args.push(`${month}%`);
  }

  sql += ' ORDER BY sh.date, sh.shift_type, s.name';
  const result = await db.execute({ sql, args });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();

  const stmts: { sql: string; args: (string | number)[] }[] = [];

  if (body.month) {
    stmts.push({ sql: 'DELETE FROM shifts WHERE date LIKE ?', args: [`${body.month}%`] });
  }

  for (const s of body.shifts) {
    stmts.push({
      sql: 'INSERT INTO shifts (staff_id, date, shift_type) VALUES (?, ?, ?)',
      args: [s.staff_id, s.date, s.shift_type],
    });
  }

  await db.batch(stmts, 'write');
  return NextResponse.json({ success: true, count: body.shifts.length });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();

  if (body.month && body.confirm) {
    await db.execute({ sql: 'UPDATE shifts SET is_confirmed = 1 WHERE date LIKE ?', args: [`${body.month}%`] });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
