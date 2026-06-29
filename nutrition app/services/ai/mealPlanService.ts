/**
 * Calls Claude to generate a 7-day meal calendar personalised to the user's profile.
 * Returns a MealCalendar object.
 */
import Anthropic from '@anthropic-ai/sdk';
import { UserProfile, MealCalendar } from '../../types';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generateMealPlan(profile: Partial<UserProfile>): Promise<MealCalendar> {
  const prompt = buildMealPlanPrompt(profile);

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as { type: 'text'; text: string }).text;

  // Extract JSON block from Claude's response
  const jsonMatch = raw.match(/```json\n([\s\S]*?)\n```/);
  if (!jsonMatch) throw new Error('No JSON returned from meal plan generation');

  return JSON.parse(jsonMatch[1]) as MealCalendar;
}

function buildMealPlanPrompt(profile: Partial<UserProfile>): string {
  return `You are a professional nutritionist. Generate a 7-day personalised meal plan for the following user.

User profile:
- Goal: ${profile.goal}
- Age: ${profile.age}, Sex: ${profile.sex}
- Height: ${profile.heightCm}cm, Weight: ${profile.weightKg}kg
- Activity level: ${profile.activityLevel}
- Max cooking time per day: ${profile.cookingTimeMinutes} minutes
- Allergies: ${(profile.allergies ?? []).join(', ') || 'none'}
- Intolerances: ${(profile.intolerances ?? []).join(', ') || 'none'}

Return a JSON object matching the MealCalendar TypeScript type below. Wrap it in a \`\`\`json block.

interface MealCalendar {
  weekStartDate: string;       // today's date ISO
  days: DayPlan[];             // 7 days
}
interface DayPlan {
  date: string;
  meals: Meal[];               // breakfast, lunch, dinner, 1-2 snacks
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}
interface Meal {
  id: string;
  type: 'breakfast'|'lunch'|'dinner'|'snack';
  name: string;
  description: string;
  prepTimeMinutes: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: { name: string; amount: string }[];
  instructions: string[];
}

Important: every meal must respect the user's allergies and intolerances, and prep time must not exceed ${profile.cookingTimeMinutes} minutes.`;
}
