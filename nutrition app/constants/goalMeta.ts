import { Colors } from './theme';
import { GoalType } from '../types';

export const GOAL_META: Record<GoalType, { label: string; emoji: string; color: string }> = {
  cut: { label: 'Cut', emoji: '🔥', color: Colors.cut },
  bulk: { label: 'Bulk', emoji: '💪', color: Colors.bulk },
  muscleGrowth: { label: 'Muscle Growth', emoji: '⚡', color: Colors.muscleGrowth },
  maintain: { label: 'Maintain', emoji: '⚖️', color: Colors.maintain },
};
