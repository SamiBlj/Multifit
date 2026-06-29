import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getProfile } from '../db/queries/users';
import { generateMealPlanAI } from '../services/openai/mealPlanService';
import { saveMealCalendar, getWeekCalendar, getTodaysMeals } from '../db/queries/meals';
import { sendDailyMealNotification } from '../services/notifications/pushService';
import { findUserById } from '../db/queries/users';

function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export async function generatePlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await getProfile(req.userId!);
    if (!profile) return res.status(400).json({ error: 'Complete your profile first' });

    const calendar = await generateMealPlanAI(profile);
    await saveMealCalendar(req.userId!, calendar);

    // Notify user their new plan is ready
    const user = await findUserById(req.userId!);
    if (user?.push_token) {
      await sendDailyMealNotification(user.push_token, calendar.days[0]?.meals[0]?.name ?? 'your meals');
    }

    return res.json({ calendar });
  } catch (err) {
    next(err);
  }
}

export async function getWeek(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const weekStart = (req.query.date as string) ?? getMondayOfWeek();
    const days = await getWeekCalendar(req.userId!, weekStart);
    return res.json({ weekStart, days });
  } catch (err) {
    next(err);
  }
}

export async function getToday(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const meals = await getTodaysMeals(req.userId!, today);
    return res.json({ date: today, meals });
  } catch (err) {
    next(err);
  }
}
