import OpenAI from 'openai';
import { v4 as uuid } from 'uuid';
import { MealCalendar } from '../../types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateMealPlanAI(profile: {
  goal: string; age: number; sex: string;
  height_cm: number; weight_kg: number; activity_level: string;
  cooking_time_minutes: number; allergies: string[]; intolerances: string[];
}): Promise<MealCalendar> {
  const weekStart = getMondayISO();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are an expert nutritionist. Return only valid JSON matching the requested schema.',
      },
      {
        role: 'user',
        content: buildPrompt(profile, weekStart),
      },
    ],
    max_tokens: 4096,
  });

  const raw = response.choices[0].message.content ?? '{}';
  const parsed = JSON.parse(raw) as MealCalendar;

  // Ensure every meal has a UUID
  for (const day of parsed.days) {
    for (const meal of day.meals) {
      if (!meal.id) meal.id = uuid();
    }
  }

  return parsed;
}

function buildPrompt(profile: ReturnType<typeof Object.assign>, weekStart: string): string {
  return `Generate a 7-day meal plan starting ${weekStart} for this user:
- Goal: ${profile.goal}
- Age: ${profile.age}, Sex: ${profile.sex}
- Height: ${profile.height_cm}cm, Weight: ${profile.weight_kg}kg
- Activity: ${profile.activity_level}
- Max cook time/day: ${profile.cooking_time_minutes} min
- Allergies: ${profile.allergies.join(', ') || 'none'}
- Intolerances: ${profile.intolerances.join(', ') || 'none'}

Return JSON matching this shape exactly:
{
  "weekStartDate": "YYYY-MM-DD",
  "days": [{
    "date": "YYYY-MM-DD",
    "totalCalories": number,
    "totalProtein": number,
    "totalCarbs": number,
    "totalFat": number,
    "meals": [{
      "id": "uuid",
      "type": "breakfast"|"lunch"|"dinner"|"snack",
      "name": string,
      "description": string,
      "prepTimeMinutes": number,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "ingredients": [{"name": string, "amount": string}],
      "instructions": [string]
    }]
  }]
}

Rules: respect allergies/intolerances strictly. No meal's prepTime may exceed ${profile.cooking_time_minutes} min.
Calorie targets: cut=deficit, bulk=surplus 300-500kcal, muscleGrowth=slight surplus, maintain=maintenance.`;
}

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}
