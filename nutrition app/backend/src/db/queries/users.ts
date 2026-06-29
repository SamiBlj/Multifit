import { pool } from '../pool';

export async function createUser(email: string, passwordHash: string, name: string) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, created_at`,
    [email, passwordHash, name]
  );
  return rows[0];
}

export async function findUserByEmail(email: string) {
  const { rows } = await pool.query(
    `SELECT id, email, name, password_hash, push_token FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const { rows } = await pool.query(
    `SELECT id, email, name, push_token FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function savePushToken(userId: string, token: string) {
  await pool.query(`UPDATE users SET push_token = $1 WHERE id = $2`, [token, userId]);
}

export async function upsertProfile(userId: string, data: {
  age: number; sex: string; heightCm: number; weightKg: number;
  activityLevel: string; goal: string; cookingTimeMinutes: number;
  allergies: string[]; intolerances: string[];
}) {
  const { rows } = await pool.query(
    `INSERT INTO profiles
       (user_id, age, sex, height_cm, weight_kg, activity_level, goal,
        cooking_time_minutes, allergies, intolerances, onboarding_complete)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, true)
     ON CONFLICT (user_id) DO UPDATE SET
       age = EXCLUDED.age, sex = EXCLUDED.sex,
       height_cm = EXCLUDED.height_cm, weight_kg = EXCLUDED.weight_kg,
       activity_level = EXCLUDED.activity_level, goal = EXCLUDED.goal,
       cooking_time_minutes = EXCLUDED.cooking_time_minutes,
       allergies = EXCLUDED.allergies, intolerances = EXCLUDED.intolerances,
       onboarding_complete = true, updated_at = NOW()
     RETURNING *`,
    [userId, data.age, data.sex, data.heightCm, data.weightKg,
     data.activityLevel, data.goal, data.cookingTimeMinutes,
     data.allergies, data.intolerances]
  );
  return rows[0];
}

export async function getProfile(userId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM profiles WHERE user_id = $1`, [userId]
  );
  return rows[0] ?? null;
}
