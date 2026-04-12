import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await getDb();

  await db.execute({
    sql: `UPDATE staff SET
      name = ?, experience_level = ?,
      skill_serving = ?, skill_drink = ?, skill_register = ?, skill_close = ?,
      skill_roast = ?, skill_language = ?, skill_cocktail = ?, skill_cleaning = ?,
      personality_tags = ?, compatibility_notes = ?,
      max_days_per_week = ?, max_consecutive_days = ?,
      updated_at = datetime('now')
    WHERE id = ?`,
    args: [
      body.name, body.experience_level,
      body.skill_serving, body.skill_drink, body.skill_register, body.skill_close,
      body.skill_roast, body.skill_language, body.skill_cocktail, body.skill_cleaning,
      JSON.stringify(body.personality_tags || []), body.compatibility_notes || '',
      body.max_days_per_week, body.max_consecutive_days,
      Number(id),
    ],
  });

  const updated = await db.execute({ sql: 'SELECT * FROM staff WHERE id = ?', args: [Number(id)] });
  return NextResponse.json(updated.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  const staff = await db.execute({ sql: 'SELECT is_owner FROM staff WHERE id = ?', args: [Number(id)] });
  if (staff.rows[0] && (staff.rows[0].is_owner as number)) {
    return NextResponse.json({ error: 'オーナーは削除できません' }, { status: 400 });
  }

  await db.execute({ sql: 'DELETE FROM staff WHERE id = ?', args: [Number(id)] });
  return NextResponse.json({ success: true });
}
