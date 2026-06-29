import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getMe, saveProfile, savePushToken } from '../controllers/usersController';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/me', getMe);
usersRouter.put('/profile', saveProfile);
usersRouter.post('/push-token', savePushToken);
