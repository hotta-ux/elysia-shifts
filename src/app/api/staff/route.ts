import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute('SELECT * FROM staff ORDER BY is_owner DESC, name ASC');
    return NextResponse.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();

  const result = await db.execute({
    sql: `INSERT INTO staff (name, experience_level, skill_serving, skill_drink, skill_register, skill_close, skill_roast, skill_language, skill_cocktail, skill_cleaning, personality_tags, compatibility_notes, max_days_per_week, max_consecutive_days)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      body.name,
      body.experience_level || 'junior',
      body.skill_serving || 3,
      body.skill_drink || 3,
      body.skill_register || 3,
      body.skill_close || 3,
      body.skill_roast || 1,
      body.skill_language || 1,
      body.skill_cocktail || 1,
      body.skill_cleaning || 3,
      JSON.stringify(body.personality_tags || []),
      body.compatibility_notes || '',
      body.max_days_per_week || 5,
      body.max_consecutive_days || 5,
    ],
  });

  const newStaff = await db.execute({ sql: 'SELECT * FROM staff WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  return NextResponse.json(newStaff.rows[0], { status: 201 });
}
