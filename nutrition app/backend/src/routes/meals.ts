import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generatePlan, getWeek, getToday } from '../controllers/mealController';

export const mealsRouter = Router();

mealsRouter.use(requireAuth);

// POST /api/meals/generate   — trigger AI generation for the current week
mealsRouter.post('/generate', generatePlan);

// GET  /api/meals/week?date=YYYY-MM-DD  — fetch full week calendar
mealsRouter.get('/week', getWeek);

// GET  /api/meals/today  — shortcut for today's meals
mealsRouter.get('/today', getToday);
