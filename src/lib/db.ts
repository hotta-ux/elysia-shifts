import { createClient, type Client } from '@libsql/client/web';

let client: Client;
let initialized = false;

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:shift-manager.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function getDb(): Promise<Client> {
  const db = getClient();
  if (!initialized) {
    try {
      await initDb(db);
    } catch (e) {
      console.error('DB init warning:', e);
    }
    initialized = true;
  }
  return db;
}

async function initDb(db: Client) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_owner INTEGER DEFAULT 0,
      experience_level TEXT DEFAULT 'junior' CHECK(experience_level IN ('junior', 'mid', 'veteran')),
      skill_serving INTEGER DEFAULT 3 CHECK(skill_serving BETWEEN 1 AND 5),
      skill_drink INTEGER DEFAULT 3 CHECK(skill_drink BETWEEN 1 AND 5),
      skill_register INTEGER DEFAULT 3 CHECK(skill_register BETWEEN 1 AND 5),
      skill_close INTEGER DEFAULT 3 CHECK(skill_close BETWEEN 1 AND 5),
      skill_roast INTEGER DEFAULT 1 CHECK(skill_roast BETWEEN 1 AND 5),
      skill_language INTEGER DEFAULT 1 CHECK(skill_language BETWEEN 1 AND 5),
      skill_cocktail INTEGER DEFAULT 1 CHECK(skill_cocktail BETWEEN 1 AND 5),
      skill_cleaning INTEGER DEFAULT 3 CHECK(skill_cleaning BETWEEN 1 AND 5),
      personality_tags TEXT DEFAULT '[]',
      compatibility_notes TEXT DEFAULT '',
      max_days_per_week INTEGER DEFAULT 5,
      max_consecutive_days INTEGER DEFAULT 5,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shift_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      shift_type TEXT NOT NULL CHECK(shift_type IN ('early', 'mid', 'late')),
      availability TEXT DEFAULT 'available' CHECK(availability IN ('available', 'unavailable', 'either')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
      UNIQUE(staff_id, date, shift_type)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      shift_type TEXT NOT NULL CHECK(shift_type IN ('early', 'mid', 'late')),
      is_confirmed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS shift_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekday_staff_count INTEGER DEFAULT 2,
      weekend_staff_count INTEGER DEFAULT 3,
      closed_day INTEGER DEFAULT 2,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrate: add new skill columns if missing
  const columns = await db.execute("PRAGMA table_info(staff)");
  const colNames = columns.rows.map(c => c.name as string);
  const migrations: [string, string][] = [
    ['skill_roast', 'ALTER TABLE staff ADD COLUMN skill_roast INTEGER DEFAULT 1'],
    ['skill_language', 'ALTER TABLE staff ADD COLUMN skill_language INTEGER DEFAULT 1'],
    ['skill_cocktail', 'ALTER TABLE staff ADD COLUMN skill_cocktail INTEGER DEFAULT 1'],
    ['skill_cleaning', 'ALTER TABLE staff ADD COLUMN skill_cleaning INTEGER DEFAULT 3'],
  ];
  for (const [col, sql] of migrations) {
    if (!colNames.includes(col)) {
      await db.execute(sql);
    }
  }

  // Set 高培勛 as owner
  await db.execute("UPDATE staff SET is_owner = 1 WHERE name = '高培勛' AND is_owner = 0");

  // Insert default settings if none exist
  const settings = await db.execute('SELECT COUNT(*) as cnt FROM shift_settings');
  if ((settings.rows[0].cnt as number) === 0) {
    await db.execute('INSERT INTO shift_settings (weekday_staff_count, weekend_staff_count) VALUES (2, 3)');
  }

  // Insert 堀田 as owner if not exists
  const owner = await db.execute("SELECT COUNT(*) as cnt FROM staff WHERE is_owner = 1");
  if ((owner.rows[0].cnt as number) === 0) {
    await db.execute({
      sql: `INSERT INTO staff (name, is_owner, experience_level, skill_serving, skill_drink, skill_register, skill_close, skill_roast, skill_language, skill_cocktail, skill_cleaning, personality_tags, max_days_per_week, max_consecutive_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['堀田', 1, 'veteran', 5, 5, 5, 5, 5, 3, 3, 5, '["リーダー", "オーナー"]', 7, 7],
    });
  }
}

export type Staff = {
  id: number;
  name: string;
  is_owner: number;
  experience_level: 'junior' | 'mid' | 'veteran';
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
  created_at: string;
  updated_at: string;
};

export type ShiftRequest = {
  id: number;
  staff_id: number;
  date: string;
  shift_type: 'early' | 'mid' | 'late';
  availability: 'available' | 'unavailable' | 'either';
  created_at: string;
};

export type Shift = {
  id: number;
  staff_id: number;
  date: string;
  shift_type: 'early' | 'mid' | 'late';
  is_confirmed: number;
  created_at: string;
};
