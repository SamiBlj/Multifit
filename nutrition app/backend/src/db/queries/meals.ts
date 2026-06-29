import { pool } from '../pool';
import { MealCalendar } from '../../types';

export async function saveMealCalendar(userId: string, calendar: MealCalendar): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert the calendar row
    const { rows: [cal] } = await client.query(
      `INSERT INTO meal_calendars (user_id, week_start_date)
       VALUES ($1, $2)
       ON CONFLICT (user_id, week_start_date) DO UPDATE SET generated_at = NOW()
       RETURNING id`,
      [userId, calendar.weekStartDate]
    );

    for (const day of calendar.days) {
      const { rows: [dp] } = await client.query(
        `INSERT INTO day_plans (calendar_id, date, total_calories, total_protein_g, total_carbs_g, total_fat_g)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [cal.id, day.date, day.totalCalories, day.totalProtein, day.totalCarbs, day.totalFat]
      );
      if (!dp) continue;

      for (const meal of day.meals) {
        await client.query(
          `INSERT INTO meals
             (id, day_plan_id, type, name, description, prep_time_mins,
              calories, protein_g, carbs_g, fat_g, ingredients, instructions)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [meal.id, dp.id, meal.type, meal.name, meal.description,
           meal.prepTimeMinutes, meal.calories, meal.protein, meal.carbs,
           meal.fat, JSON.stringify(meal.ingredients), meal.instructions]
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getTodaysMeals(userId: string, date: string) {
  const { rows } = await pool.query(
    `SELECT m.*
     FROM meals m
     JOIN day_plans dp ON dp.id = m.day_plan_id
     JOIN meal_calendars mc ON mc.id = dp.calendar_id
     WHERE mc.user_id = $1 AND dp.date = $2
     ORDER BY m.type`,
    [userId, date]
  );
  return rows;
}

export async function getWeekCalendar(userId: string, weekStart: string) {
  const { rows } = await pool.query(
    `SELECT dp.date, dp.total_calories, dp.total_protein_g, dp.total_carbs_g, dp.total_fat_g,
            json_agg(m ORDER BY m.type) AS meals
     FROM day_plans dp
     JOIN meal_calendars mc ON mc.id = dp.calendar_id
     JOIN meals m ON m.day_plan_id = dp.id
     WHERE mc.user_id = $1 AND mc.week_start_date = $2
     GROUP BY dp.id
     ORDER BY dp.date`,
    [userId, weekStart]
  );
  return rows;
}
