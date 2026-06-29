import { pool } from '../pool';
import { WorkoutPlan } from '../../types';

export async function saveWorkoutPlan(userId: string, plan: WorkoutPlan): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [wp] } = await client.query(
      `INSERT INTO workout_plans (id, user_id, goal, weeks_total)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET goal = EXCLUDED.goal
       RETURNING id`,
      [plan.id, userId, plan.goal, plan.weeksTotal]
    );

    for (const [i, day] of plan.days.entries()) {
      const { rows: [wd] } = await client.query(
        `INSERT INTO workout_days (plan_id, day_order, day_label, focus, duration_minutes)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [wp.id, i, day.dayLabel, day.focus, day.durationMinutes]
      );

      for (const ex of day.exercises) {
        await client.query(
          `INSERT INTO exercises
             (id, workout_day_id, name, muscle_groups, sets, reps, rest_seconds, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [ex.id, wd.id, ex.name, ex.muscleGroups, ex.sets, ex.reps, ex.restSeconds, ex.notes ?? null]
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

export async function getLatestWorkoutPlan(userId: string) {
  const { rows } = await pool.query(
    `SELECT wp.*, json_agg(
       json_build_object(
         'dayLabel', wd.day_label,
         'focus', wd.focus,
         'durationMinutes', wd.duration_minutes,
         'exercises', (
           SELECT json_agg(json_build_object(
             'id', e.id, 'name', e.name, 'muscleGroups', e.muscle_groups,
             'sets', e.sets, 'reps', e.reps, 'restSeconds', e.rest_seconds,
             'notes', e.notes, 'demoUrl', e.demo_s3_key
           ) ORDER BY e.id)
           FROM exercises e WHERE e.workout_day_id = wd.id
         )
       ) ORDER BY wd.day_order
     ) AS days
     FROM workout_plans wp
     JOIN workout_days wd ON wd.plan_id = wp.id
     WHERE wp.user_id = $1
     GROUP BY wp.id
     ORDER BY wp.generated_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}
