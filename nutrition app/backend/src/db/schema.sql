-- =============================================================================
--  MULTIFIT — PostgreSQL Schema  (v2)
--  Run once:  psql $DATABASE_URL -f schema.sql
--
--  Sections
--  ─────────────────────────────────────────────────────────────────────────
--  1.  Extensions & helpers
--  2.  Auth  ─────────────  users · refresh_tokens
--  3.  Profile  ──────────  profiles · daily_targets · user_settings
--  4.  Nutrition plan  ───  meal_catalog · meal_calendars · day_plans · meals
--  5.  Meal tracking  ────  meal_logs · water_logs · meal_ratings
--  6.  Workout plan  ─────  workout_plans · workout_days · exercises
--  7.  Workout tracking  ─  workout_sessions · exercise_sets
--  8.  Progress  ─────────  body_metrics · progress_photos
--  9.  Recommendations  ──  recommendations · recommendation_meals
--  10. Notifications  ────  notification_logs
--  11. Indexes
--  12. Helper triggers
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS & HELPERS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid() alternative


-- =============================================================================
-- 2. AUTH
-- =============================================================================

-- ── users ─────────────────────────────────────────────────────────────────────
--  Core identity record. One row per account.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email            TEXT        UNIQUE NOT NULL,
  password_hash    TEXT        NOT NULL,                 -- bcrypt hash
  name             TEXT        NOT NULL,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,    -- soft-disable accounts
  push_token       TEXT,                                 -- Expo push token
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── refresh_tokens ────────────────────────────────────────────────────────────
--  Stored JWT refresh tokens (one per device/session).
--  On logout: delete the row.  On refresh: rotate (delete old, insert new).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash       TEXT        UNIQUE NOT NULL,          -- SHA-256 of the raw token
  device_label     TEXT,                                 -- e.g. "iPhone 15 Pro"
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 3. PROFILE
-- =============================================================================

-- ── profiles ──────────────────────────────────────────────────────────────────
--  Physical stats and dietary preferences collected during onboarding.
--  One-to-one with users.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age                   SMALLINT    NOT NULL CHECK (age BETWEEN 10 AND 120),
  sex                   TEXT        NOT NULL CHECK (sex IN ('male', 'female', 'other')),
  height_cm             NUMERIC(5,1) NOT NULL CHECK (height_cm > 0),
  weight_kg             NUMERIC(5,1) NOT NULL CHECK (weight_kg > 0),
  activity_level        TEXT        NOT NULL
                          CHECK (activity_level IN (
                            'sedentary', 'lightlyActive',
                            'moderatelyActive', 'veryActive', 'extraActive'
                          )),
  goal                  TEXT        NOT NULL
                          CHECK (goal IN ('cut', 'bulk', 'muscleGrowth', 'maintain')),
  cooking_time_minutes  SMALLINT    NOT NULL DEFAULT 30 CHECK (cooking_time_minutes > 0),
  allergies             TEXT[]      NOT NULL DEFAULT '{}',
  intolerances          TEXT[]      NOT NULL DEFAULT '{}',
  onboarding_complete   BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── daily_targets ─────────────────────────────────────────────────────────────
--  Calorie & macro targets calculated from the profile (Mifflin-St Jeor + goal).
--  Re-calculated whenever the profile changes.  History is kept so progress
--  charts can show targets at the time, not just today's targets.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_targets (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calories         SMALLINT    NOT NULL,
  protein_g        SMALLINT    NOT NULL,
  carbs_g          SMALLINT    NOT NULL,
  fat_g            SMALLINT    NOT NULL,
  bmr              SMALLINT    NOT NULL,   -- basal metabolic rate (kcal)
  tdee             SMALLINT    NOT NULL,   -- total daily energy expenditure (kcal)
  effective_from   DATE        NOT NULL DEFAULT CURRENT_DATE,
  effective_to     DATE,                  -- NULL = currently active target
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT only_one_active_target UNIQUE (user_id, effective_to)  -- one NULL per user
);

-- ── user_settings ─────────────────────────────────────────────────────────────
--  App-level preferences. One-to-one with users.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  units                     TEXT        NOT NULL DEFAULT 'metric'
                              CHECK (units IN ('metric', 'imperial')),
  theme                     TEXT        NOT NULL DEFAULT 'dark'
                              CHECK (theme IN ('dark', 'light', 'system')),
  notifications_enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  meal_reminder_times       TIME[]      NOT NULL DEFAULT ARRAY['08:00'::TIME, '12:30'::TIME, '18:30'::TIME],
  workout_reminder_time     TIME,
  weekly_report_enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 4. NUTRITION PLAN
-- =============================================================================

-- ── meal_catalog ──────────────────────────────────────────────────────────────
--  Master library of reusable meal templates (populated from our mealCatalog.ts
--  seed data and expanded over time).  AI-generated meals that are well-rated
--  can also be promoted here.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_catalog (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_key      TEXT        UNIQUE NOT NULL,   -- e.g. 'b1', 'l3' — matches TS catalog
  name             TEXT        NOT NULL,
  type             TEXT        NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description      TEXT,
  prep_time_mins   SMALLINT    NOT NULL,
  calories         SMALLINT    NOT NULL,
  protein_g        NUMERIC(5,1) NOT NULL,
  carbs_g          NUMERIC(5,1) NOT NULL,
  fat_g            NUMERIC(5,1) NOT NULL,
  allergens        TEXT[]      NOT NULL DEFAULT '{}',
  ingredients      JSONB       NOT NULL DEFAULT '[]',   -- [{name, amount}]
  instructions     TEXT[]      NOT NULL DEFAULT '{}',
  image_url        TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── meal_calendars ────────────────────────────────────────────────────────────
--  One row per AI-generated 7-day block per user.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_calendars (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date  DATE        NOT NULL,
  source           TEXT        NOT NULL DEFAULT 'ai'
                     CHECK (source IN ('ai', 'manual', 'recommender')),
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start_date)
);

-- ── day_plans ─────────────────────────────────────────────────────────────────
--  Planned meals for a single day within a calendar.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS day_plans (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id      UUID        NOT NULL REFERENCES meal_calendars(id) ON DELETE CASCADE,
  plan_date        DATE        NOT NULL,
  total_calories   SMALLINT    NOT NULL,
  total_protein_g  NUMERIC(6,1) NOT NULL,
  total_carbs_g    NUMERIC(6,1) NOT NULL,
  total_fat_g      NUMERIC(6,1) NOT NULL,
  UNIQUE (calendar_id, plan_date)
);

-- ── meals ─────────────────────────────────────────────────────────────────────
--  Individual planned meals within a day plan.
--  May reference meal_catalog (if from recommender) or be AI-freeform (catalog_id NULL).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meals (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_plan_id      UUID        NOT NULL REFERENCES day_plans(id) ON DELETE CASCADE,
  catalog_id       UUID        REFERENCES meal_catalog(id) ON DELETE SET NULL,
  meal_type        TEXT        NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  name             TEXT        NOT NULL,
  description      TEXT,
  prep_time_mins   SMALLINT    NOT NULL,
  calories         SMALLINT    NOT NULL,
  protein_g        NUMERIC(5,1) NOT NULL,
  carbs_g          NUMERIC(5,1) NOT NULL,
  fat_g            NUMERIC(5,1) NOT NULL,
  ingredients      JSONB       NOT NULL DEFAULT '[]',
  instructions     TEXT[]      NOT NULL DEFAULT '{}',
  image_s3_key     TEXT                                  -- S3 object key for meal photo
);


-- =============================================================================
-- 5. MEAL TRACKING
-- =============================================================================

-- ── meal_logs ─────────────────────────────────────────────────────────────────
--  What the user ACTUALLY ate, stamped with the time they logged it.
--  Can link to a planned meal (planned_meal_id) or be a completely custom entry.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_logs (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  planned_meal_id  UUID        REFERENCES meals(id) ON DELETE SET NULL,
  catalog_id       UUID        REFERENCES meal_catalog(id) ON DELETE SET NULL,
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  meal_type        TEXT        NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  name             TEXT        NOT NULL,
  calories         SMALLINT    NOT NULL,
  protein_g        NUMERIC(5,1) NOT NULL,
  carbs_g          NUMERIC(5,1) NOT NULL,
  fat_g            NUMERIC(5,1) NOT NULL,
  servings         NUMERIC(4,2) NOT NULL DEFAULT 1.0,   -- e.g. 0.5 = half portion
  notes            TEXT
);

-- ── water_logs ────────────────────────────────────────────────────────────────
--  Water / fluid intake tracking per day.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_logs (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  amount_ml        SMALLINT    NOT NULL CHECK (amount_ml > 0),
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── meal_ratings ──────────────────────────────────────────────────────────────
--  User ratings for meals — used to improve the recommender over time.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_ratings (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_log_id      UUID        REFERENCES meal_logs(id) ON DELETE SET NULL,
  catalog_id       UUID        REFERENCES meal_catalog(id) ON DELETE SET NULL,
  rating           SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes            TEXT,
  rated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT meal_or_catalog CHECK (meal_log_id IS NOT NULL OR catalog_id IS NOT NULL)
);


-- =============================================================================
-- 6. WORKOUT PLAN
-- =============================================================================

-- ── workout_plans ─────────────────────────────────────────────────────────────
--  AI-generated programme header.  Multiple plans can exist (e.g. user regenerates).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_plans (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal             TEXT        NOT NULL CHECK (goal IN ('cut', 'bulk', 'muscleGrowth', 'maintain')),
  weeks_total      SMALLINT    NOT NULL DEFAULT 4,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,    -- only one active plan at a time
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── workout_days ──────────────────────────────────────────────────────────────
--  A single training day within a plan (e.g. "Day 1 — Push").
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_days (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id          UUID        NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  day_order        SMALLINT    NOT NULL,                 -- 1-based sort index
  day_label        TEXT        NOT NULL,                 -- e.g. "Monday — Push"
  focus            TEXT        NOT NULL,                 -- e.g. "Chest & Triceps"
  duration_minutes SMALLINT    NOT NULL,
  UNIQUE (plan_id, day_order)
);

-- ── exercises ─────────────────────────────────────────────────────────────────
--  Prescribed exercises for a workout day.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_day_id   UUID        NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_order   SMALLINT    NOT NULL,                 -- display order within the day
  name             TEXT        NOT NULL,
  muscle_groups    TEXT[]      NOT NULL,
  sets             SMALLINT    NOT NULL,
  reps             TEXT        NOT NULL,                 -- e.g. "8-12" or "30s"
  rest_seconds     SMALLINT    NOT NULL,
  notes            TEXT,
  demo_s3_key      TEXT,                                 -- S3 key for demo video / gif
  UNIQUE (workout_day_id, exercise_order)
);


-- =============================================================================
-- 7. WORKOUT TRACKING
-- =============================================================================

-- ── workout_sessions ──────────────────────────────────────────────────────────
--  A single completed workout session (one per time the user presses "Start").
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_sessions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_day_id   UUID        REFERENCES workout_days(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INT         GENERATED ALWAYS AS (
                     EXTRACT(EPOCH FROM (ended_at - started_at))::INT
                   ) STORED,
  calories_burned  SMALLINT,                            -- estimated from MET × weight
  notes            TEXT
);

-- ── exercise_sets ─────────────────────────────────────────────────────────────
--  Each set the user actually performed within a session.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercise_sets (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id       UUID        NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id      UUID        REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name    TEXT        NOT NULL,                -- denormalised in case exercise deleted
  set_number       SMALLINT    NOT NULL,
  reps_completed   SMALLINT,
  weight_kg        NUMERIC(6,2),                        -- NULL for bodyweight
  duration_seconds SMALLINT,                            -- for time-based sets
  rpe              SMALLINT    CHECK (rpe BETWEEN 1 AND 10),   -- rate of perceived exertion
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 8. PROGRESS
-- =============================================================================

-- ── body_metrics ──────────────────────────────────────────────────────────────
--  User-logged body measurements over time (weight, body fat %, circumferences).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_metrics (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  weight_kg        NUMERIC(5,1),
  body_fat_pct     NUMERIC(4,1) CHECK (body_fat_pct BETWEEN 1 AND 70),
  muscle_mass_kg   NUMERIC(5,1),
  -- circumferences (cm)
  waist_cm         NUMERIC(5,1),
  chest_cm         NUMERIC(5,1),
  hips_cm          NUMERIC(5,1),
  left_arm_cm      NUMERIC(5,1),
  right_arm_cm     NUMERIC(5,1),
  left_thigh_cm    NUMERIC(5,1),
  right_thigh_cm   NUMERIC(5,1),
  notes            TEXT,
  UNIQUE (user_id, log_date)
);

-- ── progress_photos ───────────────────────────────────────────────────────────
--  Before/after and ongoing progress photos stored in S3.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_photos (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  s3_key           TEXT        NOT NULL UNIQUE,
  photo_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  angle            TEXT        CHECK (angle IN ('front', 'side', 'back', 'other')),
  caption          TEXT,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 9. RECOMMENDATIONS
-- =============================================================================

-- ── recommendations ───────────────────────────────────────────────────────────
--  Each time the random-forest recommender runs for a user, one header row is
--  stored here.  The individual scored meals go into recommendation_meals.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_calories  SMALLINT    NOT NULL,
  target_protein_g SMALLINT    NOT NULL,
  target_carbs_g   SMALLINT    NOT NULL,
  target_fat_g     SMALLINT    NOT NULL,
  algorithm        TEXT        NOT NULL DEFAULT 'random_forest_v1',
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── recommendation_meals ──────────────────────────────────────────────────────
--  Scored & ranked meals produced by the recommender for one recommendation run.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendation_meals (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  recommendation_id UUID       NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  catalog_id       UUID        NOT NULL REFERENCES meal_catalog(id) ON DELETE CASCADE,
  meal_type        TEXT        NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  rank             SMALLINT    NOT NULL,   -- 1 = best for this meal type
  score            NUMERIC(5,4) NOT NULL,  -- 0.0000 – 1.0000
  UNIQUE (recommendation_id, catalog_id)
);


-- =============================================================================
-- 10. NOTIFICATIONS
-- =============================================================================

-- ── notification_logs ─────────────────────────────────────────────────────────
--  Audit trail of every push notification sent.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_logs (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_token       TEXT        NOT NULL,
  notification_type TEXT       NOT NULL
                     CHECK (notification_type IN (
                       'meal_reminder', 'workout_reminder',
                       'weekly_report', 'plan_ready', 'custom'
                     )),
  title            TEXT        NOT NULL,
  body             TEXT        NOT NULL,
  data             JSONB       NOT NULL DEFAULT '{}',
  expo_ticket_id   TEXT,                   -- receipt from Expo push API
  status           TEXT        NOT NULL DEFAULT 'sent'
                     CHECK (status IN ('sent', 'delivered', 'failed')),
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 11. INDEXES
-- =============================================================================

-- Auth
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user     ON refresh_tokens(user_id);

-- Profile
CREATE INDEX IF NOT EXISTS idx_daily_targets_user      ON daily_targets(user_id, effective_from DESC);

-- Nutrition plan
CREATE INDEX IF NOT EXISTS idx_meal_calendars_user     ON meal_calendars(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_day_plans_calendar      ON day_plans(calendar_id);
CREATE INDEX IF NOT EXISTS idx_meals_day_plan          ON meals(day_plan_id);
CREATE INDEX IF NOT EXISTS idx_meals_catalog           ON meals(catalog_id) WHERE catalog_id IS NOT NULL;

-- Meal tracking
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date     ON meal_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date    ON water_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_ratings_catalog    ON meal_ratings(catalog_id) WHERE catalog_id IS NOT NULL;

-- Workout plan
CREATE INDEX IF NOT EXISTS idx_workout_plans_user      ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_days_plan       ON workout_days(plan_id, day_order);
CREATE INDEX IF NOT EXISTS idx_exercises_day           ON exercises(workout_day_id, exercise_order);

-- Workout tracking
CREATE INDEX IF NOT EXISTS idx_sessions_user_date      ON workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session   ON exercise_sets(session_id);

-- Progress
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date  ON body_metrics(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user    ON progress_photos(user_id, photo_date DESC);

-- Recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_user    ON recommendations(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rec_meals_rec           ON recommendation_meals(recommendation_id, meal_type, rank);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notification_logs_user  ON notification_logs(user_id, sent_at DESC);


-- =============================================================================
-- 12. HELPER TRIGGERS  (auto-update updated_at columns)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_meal_catalog_updated_at
  BEFORE UPDATE ON meal_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
