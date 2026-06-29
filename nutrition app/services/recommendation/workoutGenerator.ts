/**
 * Local workout plan generator — works offline, no API needed.
 * Produces a 4-week programme matched to the user's goal and split preference.
 */
import { UserProfile, WorkoutPlan, WorkoutDay, Exercise } from '../../types';

// ─── Exercise library ─────────────────────────────────────────────────────────

const PUSH_CHEST: Exercise[] = [
  { id: 'bench', name: 'Barbell Bench Press', muscleGroups: ['chest', 'shoulders'], sets: 4, reps: '6-10', restSeconds: 120, notes: 'Tuck elbows 45°, full range of motion' },
  { id: 'incbench', name: 'Incline Dumbbell Press', muscleGroups: ['chest', 'shoulders'], sets: 3, reps: '8-12', restSeconds: 90 },
  { id: 'dpfly', name: 'Cable Fly', muscleGroups: ['chest'], sets: 3, reps: '12-15', restSeconds: 60, notes: 'Squeeze at peak contraction' },
  { id: 'pushup', name: 'Push-Ups', muscleGroups: ['chest', 'shoulders'], sets: 3, reps: '15-20', restSeconds: 60, notes: 'Control the eccentric' },
  { id: 'dips', name: 'Chest Dips', muscleGroups: ['chest', 'triceps'], sets: 3, reps: '8-12', restSeconds: 90, notes: 'Lean forward slightly to hit chest more' },
];

const PUSH_SHOULDERS: Exercise[] = [
  { id: 'ohp', name: 'Overhead Press (Barbell)', muscleGroups: ['shoulders'], sets: 4, reps: '6-10', restSeconds: 120, notes: 'Brace core, do not arch lower back' },
  { id: 'latrl', name: 'Lateral Raises', muscleGroups: ['shoulders'], sets: 4, reps: '12-20', restSeconds: 60, notes: 'Light weight, control the movement' },
  { id: 'frontr', name: 'Front Raises', muscleGroups: ['shoulders'], sets: 3, reps: '12-15', restSeconds: 60 },
  { id: 'facepull', name: 'Face Pulls', muscleGroups: ['shoulders'], sets: 3, reps: '15-20', restSeconds: 60, notes: 'Rotate wrists at the end of each rep' },
];

const PUSH_TRICEPS: Exercise[] = [
  { id: 'skullc', name: 'Skull Crushers', muscleGroups: ['triceps'], sets: 3, reps: '10-12', restSeconds: 75 },
  { id: 'tricpd', name: 'Tricep Pushdown (Cable)', muscleGroups: ['triceps'], sets: 3, reps: '12-15', restSeconds: 60 },
  { id: 'clsgrip', name: 'Close-Grip Bench Press', muscleGroups: ['triceps', 'chest'], sets: 3, reps: '8-12', restSeconds: 90 },
];

const PULL_BACK: Exercise[] = [
  { id: 'deadlift', name: 'Deadlift', muscleGroups: ['back', 'glutes'], sets: 4, reps: '4-6', restSeconds: 180, notes: 'Neutral spine throughout — hinge at the hips' },
  { id: 'row', name: 'Barbell Bent-Over Row', muscleGroups: ['back'], sets: 4, reps: '6-10', restSeconds: 120 },
  { id: 'lats', name: 'Lat Pulldown', muscleGroups: ['back'], sets: 3, reps: '10-12', restSeconds: 90, notes: 'Pull to upper chest, squeeze lats at bottom' },
  { id: 'seatedrow', name: 'Seated Cable Row', muscleGroups: ['back'], sets: 3, reps: '10-12', restSeconds: 90 },
  { id: 'pullups', name: 'Pull-Ups', muscleGroups: ['back'], sets: 3, reps: '6-12', restSeconds: 120, notes: 'Full dead hang at bottom, chin over bar at top' },
];

const PULL_BICEPS: Exercise[] = [
  { id: 'curl', name: 'Barbell Curl', muscleGroups: ['biceps'], sets: 3, reps: '8-12', restSeconds: 75 },
  { id: 'hamcurl', name: 'Hammer Curl', muscleGroups: ['biceps'], sets: 3, reps: '10-12', restSeconds: 60, notes: 'Neutral grip — targets brachialis' },
  { id: 'concurl', name: 'Concentration Curl', muscleGroups: ['biceps'], sets: 3, reps: '12-15', restSeconds: 60 },
];

const LEGS_QUAD: Exercise[] = [
  { id: 'squat', name: 'Barbell Back Squat', muscleGroups: ['legs', 'glutes'], sets: 4, reps: '5-8', restSeconds: 180, notes: 'Depth to parallel or below, chest up' },
  { id: 'legpress', name: 'Leg Press', muscleGroups: ['legs'], sets: 3, reps: '10-15', restSeconds: 90 },
  { id: 'legext', name: 'Leg Extension', muscleGroups: ['legs'], sets: 3, reps: '12-15', restSeconds: 60, notes: 'Isolation — do not lock out knee fully' },
  { id: 'bsquat', name: 'Bulgarian Split Squat', muscleGroups: ['legs', 'glutes'], sets: 3, reps: '10-12', restSeconds: 90, notes: '(each leg) — great for muscle balance' },
];

const LEGS_POSTERIOR: Exercise[] = [
  { id: 'rdl', name: 'Romanian Deadlift', muscleGroups: ['glutes', 'back'], sets: 4, reps: '8-12', restSeconds: 90, notes: 'Hip hinge, feel the hamstring stretch' },
  { id: 'hamcurlmachine', name: 'Lying Leg Curl', muscleGroups: ['legs'], sets: 3, reps: '10-15', restSeconds: 75 },
  { id: 'hipthrust', name: 'Hip Thrust (Barbell)', muscleGroups: ['glutes'], sets: 4, reps: '10-15', restSeconds: 90, notes: 'Drive through heels, squeeze glutes at top' },
  { id: 'calfraise', name: 'Standing Calf Raise', muscleGroups: ['calves'], sets: 4, reps: '15-20', restSeconds: 60 },
];

const CORE: Exercise[] = [
  { id: 'plank', name: 'Plank', muscleGroups: ['core'], sets: 3, reps: '45-60s', restSeconds: 60 },
  { id: 'crunch', name: 'Cable Crunch', muscleGroups: ['core'], sets: 3, reps: '15-20', restSeconds: 60 },
  { id: 'lcycle', name: 'Bicycle Crunch', muscleGroups: ['core'], sets: 3, reps: '20', restSeconds: 45 },
  { id: 'hollowb', name: 'Hollow Body Hold', muscleGroups: ['core'], sets: 3, reps: '30s', restSeconds: 60, notes: 'Lower back pressed firmly into the floor' },
  { id: 'abroll', name: 'Ab Wheel Rollout', muscleGroups: ['core'], sets: 3, reps: '10-12', restSeconds: 75 },
];

const CARDIO: Exercise[] = [
  { id: 'hiit', name: 'HIIT Sprint Intervals', muscleGroups: ['cardio'], sets: 8, reps: '20s on / 40s off', restSeconds: 0, notes: 'Max effort sprints — treadmill or bike' },
  { id: 'jrow', name: 'Jump Rope', muscleGroups: ['cardio'], sets: 5, reps: '2 min', restSeconds: 60 },
  { id: 'rowing', name: 'Rowing Machine', muscleGroups: ['cardio', 'back'], sets: 3, reps: '5 min', restSeconds: 90, notes: 'Maintain steady 22-24 strokes per minute' },
  { id: 'stairclimb', name: 'Stair Climber', muscleGroups: ['cardio', 'glutes'], sets: 1, reps: '20 min', restSeconds: 0 },
];

const UPPER_CUT: Exercise[] = [
  { id: 'dbpress_c', name: 'Dumbbell Press (Moderate Weight)', muscleGroups: ['chest', 'shoulders'], sets: 4, reps: '12-15', restSeconds: 60 },
  { id: 'dbrow_c', name: 'Single-Arm Dumbbell Row', muscleGroups: ['back'], sets: 4, reps: '12-15', restSeconds: 60 },
  { id: 'latpull_c', name: 'Lat Pulldown', muscleGroups: ['back'], sets: 3, reps: '15', restSeconds: 60 },
  { id: 'lraisecut', name: 'Lateral Raises', muscleGroups: ['shoulders'], sets: 3, reps: '15-20', restSeconds: 45 },
  { id: 'curlsup', name: 'Superset Curl & Pushdown', muscleGroups: ['biceps', 'triceps'], sets: 3, reps: '15 each', restSeconds: 60, notes: 'Perform back-to-back with no rest between exercises' },
];

// ─── Plan builders ────────────────────────────────────────────────────────────

function pushDay(goal: string): WorkoutDay {
  const isHeavy = goal === 'bulk';
  const exercises = [
    ...PUSH_CHEST.slice(0, isHeavy ? 3 : 4),
    ...PUSH_SHOULDERS.slice(0, 2),
    ...PUSH_TRICEPS.slice(0, 2),
  ];
  return {
    dayLabel: 'Monday — Push',
    focus: 'Chest, Shoulders & Triceps',
    durationMinutes: 55,
    exercises,
  };
}

function pullDay(goal: string): WorkoutDay {
  const isHeavy = goal === 'bulk';
  const exercises = [
    ...PULL_BACK.slice(0, isHeavy ? 4 : 3),
    ...PULL_BICEPS,
  ];
  return {
    dayLabel: 'Tuesday — Pull',
    focus: 'Back & Biceps',
    durationMinutes: 55,
    exercises,
  };
}

function legsDay(goal: string): WorkoutDay {
  return {
    dayLabel: 'Wednesday — Legs',
    focus: 'Quads, Hamstrings & Glutes',
    durationMinutes: 65,
    exercises: [
      ...LEGS_QUAD.slice(0, goal === 'cut' ? 3 : 4),
      ...LEGS_POSTERIOR.slice(0, 3),
      CORE[0],
    ],
  };
}

function upperDay(): WorkoutDay {
  return {
    dayLabel: 'Thursday — Upper',
    focus: 'Chest, Back & Shoulders',
    durationMinutes: 55,
    exercises: [
      PUSH_CHEST[0], PULL_BACK[2], PUSH_SHOULDERS[0], PULL_BACK[3],
      PUSH_CHEST[2], PUSH_SHOULDERS[1],
    ],
  };
}

function lowerDay(): WorkoutDay {
  return {
    dayLabel: 'Friday — Lower',
    focus: 'Legs & Core',
    durationMinutes: 60,
    exercises: [
      LEGS_QUAD[0], LEGS_POSTERIOR[0], LEGS_QUAD[3],
      LEGS_POSTERIOR[1], LEGS_POSTERIOR[2], ...CORE.slice(0, 2),
    ],
  };
}

function cardioDay(): WorkoutDay {
  return {
    dayLabel: 'Saturday — Cardio',
    focus: 'HIIT & Conditioning',
    durationMinutes: 35,
    exercises: [CARDIO[0], CARDIO[1], CARDIO[2], CORE[2], CORE[3]],
  };
}

function cutUpperDay(): WorkoutDay {
  return {
    dayLabel: 'Thursday — Cut Upper',
    focus: 'High-Rep Upper Body + Cardio Finisher',
    durationMinutes: 50,
    exercises: [...UPPER_CUT, CARDIO[0]],
  };
}

function cutLowerDay(): WorkoutDay {
  return {
    dayLabel: 'Saturday — Cut Lower',
    focus: 'Legs + HIIT',
    durationMinutes: 50,
    exercises: [LEGS_QUAD[1], LEGS_QUAD[3], LEGS_POSTERIOR[2], LEGS_POSTERIOR[0], CARDIO[0], CORE[0]],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateLocalWorkoutPlan(profile: Partial<UserProfile>): WorkoutPlan {
  const goal   = profile.goal ?? 'maintain';
  const planId = `local-${goal}-${Date.now()}`;

  let days: WorkoutDay[];

  switch (goal) {
    case 'bulk':
      days = [
        pushDay('bulk'),
        pullDay('bulk'),
        legsDay('bulk'),
        upperDay(),
        lowerDay(),
        { dayLabel: 'Sunday — Rest', focus: 'Active Recovery', durationMinutes: 20, exercises: [CORE[0], CORE[3]] },
      ];
      break;

    case 'cut':
      days = [
        cutUpperDay(),
        cardioDay(),
        legsDay('cut'),
        cutLowerDay(),
        { dayLabel: 'Tuesday — HIIT', focus: 'Cardio & Core', durationMinutes: 40, exercises: [CARDIO[0], CARDIO[1], ...CORE.slice(0, 3)] },
        { dayLabel: 'Friday — Upper Superset', focus: 'Upper Body Supersets', durationMinutes: 45, exercises: [...UPPER_CUT] },
      ];
      break;

    case 'muscleGrowth':
      days = [
        pushDay('muscleGrowth'),
        pullDay('muscleGrowth'),
        legsDay('muscleGrowth'),
        upperDay(),
        lowerDay(),
        { dayLabel: 'Saturday — Arms & Core', focus: 'Biceps, Triceps & Abs', durationMinutes: 45, exercises: [...PULL_BICEPS, ...PUSH_TRICEPS, ...CORE.slice(0, 3)] },
      ];
      break;

    default: // maintain
      days = [
        pushDay('maintain'),
        pullDay('maintain'),
        legsDay('maintain'),
        { dayLabel: 'Thursday — Cardio & Core', focus: 'Steady-State Cardio', durationMinutes: 40, exercises: [CARDIO[2], CARDIO[3], ...CORE.slice(0, 3)] },
        upperDay(),
        { dayLabel: 'Saturday — Active Recovery', focus: 'Mobility & Light Work', durationMinutes: 30, exercises: [CORE[0], CORE[3], ...LEGS_POSTERIOR.slice(3)] },
      ];
      break;
  }

  return {
    id: planId,
    goal,
    weeksTotal: 4,
    days,
  };
}
