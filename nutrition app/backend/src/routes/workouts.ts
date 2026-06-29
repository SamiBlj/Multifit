import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generatePlan, getPlan } from '../controllers/workoutController';

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);

// POST /api/workouts/generate  — AI-generate a new 4-week programme
workoutsRouter.post('/generate', generatePlan);

// GET  /api/workouts/plan  — fetch the user's current plan
workoutsRouter.get('/plan', getPlan);
