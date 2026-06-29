/**
 * Calls Claude to generate a weekly workout programme matched to the user's goal.
 */
import Anthropic from '@anthropic-ai/sdk';
import { UserProfile, WorkoutPlan } from '../../types';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generateWorkoutPlan(profile: Partial<UserProfile>): Promise<WorkoutPlan> {
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: buildWorkoutPrompt(profile),
      },
    ],
  });

  const raw = (message.content[0] as { type: 'text'; text: string }).text;
  const jsonMatch = raw.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) throw new Error('No JSON returned from workout plan generation');

  return JSON.parse(jsonMatch[1]) as WorkoutPlan;
}

function buildWorkoutPrompt(profile: Partial<UserProfile>): string {
  return `You are an elite personal trainer. Create a 4-week workout programme for the following user.

User profile:
- Goal: ${profile.goal}
- Age: ${profile.age}, Sex: ${profile.sex}
- Weight: ${profile.weightKg}kg, Height: ${profile.heightCm}cm
- Activity level: ${profile.activityLevel}

Return a JSON object matching the WorkoutPlan TypeScript type below. Wrap it in a \`\`\`json block.

interface WorkoutPlan {
  id: string;
  goal: string;
  weeksTotal: number;
  days: WorkoutDay[];          // 5-6 training days + rest days
}
interface WorkoutDay {
  dayLabel: string;            // e.g. "Monday — Push"
  focus: string;               // e.g. "Chest & Triceps"
  durationMinutes: number;
  exercises: Exercise[];
}
interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  sets: number;
  reps: string;                // e.g. "8-12" or "30s"
  restSeconds: number;
  notes?: string;
}

Match the programme intensity and split to the user's goal: Cut = higher reps/cardio, Bulk = heavy compound, Muscle Growth = hypertrophy, Maintain = balanced.`;
}
