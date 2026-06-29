import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { findUserById, getProfile, upsertProfile, savePushToken as dbSavePushToken } from '../db/queries/users';

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await findUserById(req.userId!);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const profile = await getProfile(req.userId!);
    return res.json({ user, profile });
  } catch (err) {
    next(err);
  }
}

export async function saveProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await upsertProfile(req.userId!, req.body);
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function savePushToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await dbSavePushToken(req.userId!, req.body.token);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
