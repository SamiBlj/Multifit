import OpenAI from 'openai';
import { v4 as uuid } from 'uuid';
import { WorkoutPlan } from '../../types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateWorkoutPlanAI(profile: {
  goal: string; age: number; sex: string;
  height_cm: number; weight_kg: number; activity_level: string;
}): Promise<WorkoutPlan> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an elite personal trainer. Return only valid JSON.',
      },
      {
        role: 'user',
        content: buildPrompt(profile),
      },
    ],
    max_tokens: 4096,
  });

  const raw = response.choices[0].message.content ?? '{}';
  const parsed = JSON.parse(raw) as WorkoutPlan;

  if (!parsed.id) parsed.id = uuid();
  for (const day of parsed.days) {
    for (const ex of day.exercises) {
      if (!ex.id) ex.id = uuid();
    }
  }

  return parsed;
}

function buildPrompt(profile: { goal: string; age: number; sex: string; height_cm: number; weight_kg: number; activity_level: string }): string {
  return `Create a 4-week workout programme for:
- Goal: ${profile.goal}
- Age: ${profile.age}, Sex: ${profile.sex}
- Weight: ${profile.weight_kg}kg, Activity: ${profile.activity_level}

Return JSON matching exactly:
{
  "id": "uuid",
  "goal": string,
  "weeksTotal": 4,
  "days": [{
    "dayLabel": string,
    "focus": string,
    "durationMinutes": number,
    "exercises": [{
      "id": "uuid",
      "name": string,
      "muscleGroups": [string],
      "sets": number,
      "reps": string,
      "restSeconds": number,
      "notes": string | null
    }]
  }]
}

Include rest days as entries with empty exercises array. Match intensity to goal:
cut = higher reps (12-15), cardio finishers
bulk = heavy compounds (4-6 sets, 5-8 reps)
muscleGrowth = hypertrophy range (3-4 sets, 8-12 reps)
maintain = balanced, moderate volume`;
}
