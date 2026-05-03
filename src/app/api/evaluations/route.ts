import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const GRADE_NAMES: Record<string, string> = {
  G1: 'Rookie',
  G2: 'Regular',
  G3: 'Ace',
  G4: 'Star',
  G5: 'Hero',
  G6: 'Legend',
};

const GRADE_WAGES: Record<string, number> = {
  G1: 0,
  G2: 30,
  G3: 60,
  G4: 100,
  G5: 150,
  G6: 200,
};

function calcBeanSalesScore(amount: number): number {
  if (amount >= 500000) return 10;
  if (amount >= 300000) return 8;
  if (amount >= 150000) return 6;
  if (amount >= 50000) return 4;
  return 2;
}

function calcTenureScore(hireDateStr: string): number {
  const hire = new Date(hireDateStr);
  const now = new Date();
  const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
  if (months >= 18) return 10;
  if (months >= 12) return 8;
  if (months >= 6) return 6;
  if (months >= 3) return 4;
  if (months >= 1) return 2;
  return 0;
}

function calcGrade(totalScore: number, tenureMonths: number): string {
  if (totalScore >= 44 && tenureMonths >= 18) return 'G6';
  if (totalScore >= 38 && tenureMonths >= 12) return 'G5';
  if (totalScore >= 30 && tenureMonths >= 6) return 'G4';
  if (totalScore >= 23 && tenureMonths >= 3) return 'G3';
  if (totalScore >= 17 && tenureMonths >= 1) return 'G2';
  return 'G1';
}

function getTenureMonths(hireDateStr: string): number {
  const hire = new Date(hireDateStr);
  const now = new Date();
  return (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
}

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute(`
      SELECT e.*, s.name as staff_name
      FROM evaluations e
      JOIN staff s ON e.staff_id = s.id
      ORDER BY e.created_at DESC
    `);
    return NextResponse.json({ evaluations: result.rows, gradeNames: GRADE_NAMES, gradeWages: GRADE_WAGES });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { staff_id, period, bean_sales_amount, shift_contribution, attitude } = body;

    // Get staff info for barista skill calc and tenure
    const staffResult = await db.execute({ sql: 'SELECT * FROM staff WHERE id = ?', args: [staff_id] });
    if (staffResult.rows.length === 0) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }
    const staff = staffResult.rows[0];

    // Barista skill: average of 8 skills * 3 (max 15)
    const skillAvg = (
      (staff.skill_serving as number) +
      (staff.skill_drink as number) +
      (staff.skill_register as number) +
      (staff.skill_close as number) +
      (staff.skill_roast as number) +
      (staff.skill_language as number) +
      (staff.skill_cocktail as number) +
      (staff.skill_cleaning as number)
    ) / 8;
    const baristaSkill = Math.round(skillAvg * 3 * 10) / 10; // max 15

    // Bean sales score (max 10)
    const beanSalesScore = calcBeanSalesScore(bean_sales_amount || 0);

    // Tenure score (max 10)
    const hireDate = (staff.hire_date as string) || new Date().toISOString().split('T')[0];
    const tenureScore = calcTenureScore(hireDate);
    const tenureMonths = getTenureMonths(hireDate);

    // Total (max 50)
    const totalScore = Math.round(baristaSkill + beanSalesScore + shift_contribution + attitude + tenureScore);

    // Determine grade
    const grade = calcGrade(totalScore, tenureMonths);

    // Save evaluation
    const result = await db.execute({
      sql: `INSERT INTO evaluations (staff_id, period, barista_skill, bean_sales, bean_sales_score, shift_contribution, attitude, tenure_score, total_score, grade)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [staff_id, period, baristaSkill, bean_sales_amount || 0, beanSalesScore, shift_contribution, attitude, tenureScore, totalScore, grade],
    });

    // Update staff grade and wage
    await db.execute({
      sql: 'UPDATE staff SET grade = ?, hourly_wage = ?, updated_at = datetime(\'now\') WHERE id = ?',
      args: [grade, GRADE_WAGES[grade], staff_id],
    });

    const newEval = await db.execute({ sql: 'SELECT * FROM evaluations WHERE id = ?', args: [Number(result.lastInsertRowid)] });
    return NextResponse.json(newEval.rows[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
