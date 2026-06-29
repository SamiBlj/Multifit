import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getProfile } from '../db/queries/users';
import { generateWorkoutPlanAI } from '../services/openai/workoutService';
import { saveWorkoutPlan, getLatestWorkoutPlan } from '../db/queries/workouts';

export async function generatePlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await getProfile(req.userId!);
    if (!profile) return res.status(400).json({ error: 'Complete your profile first' });

    const plan = await generateWorkoutPlanAI(profile);
    await saveWorkoutPlan(req.userId!, plan);

    return res.json({ plan });
  } catch (err) {
    next(err);
  }
}

export async function getPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plan = await getLatestWorkoutPlan(req.userId!);
    if (!plan) return res.status(404).json({ error: 'No workout plan found' });
    return res.json({ plan });
  } catch (err) {
    next(err);
  }
}
