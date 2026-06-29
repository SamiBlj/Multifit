/**
 * Onboarding Step 5 — Goal selection (Cut / Bulk / Muscle Growth / Maintain)
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { GoalType } from '../../types';

const GOALS: {
  value: GoalType;
  emoji: string;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: 'cut',
    emoji: '🔥',
    label: 'Cut',
    description: 'Lose fat while preserving muscle. Calorie deficit, high protein.',
    color: Colors.cut,
  },
  {
    value: 'bulk',
    emoji: '💪',
    label: 'Bulk',
    description: 'Gain size and mass. Calorie surplus, heavy compound lifts.',
    color: Colors.bulk,
  },
  {
    value: 'muscleGrowth',
    emoji: '⚡',
    label: 'Muscle Growth',
    description: 'Build lean muscle. Progressive overload, body recomposition.',
    color: Colors.muscleGrowth,
  },
  {
    value: 'maintain',
    emoji: '⚖️',
    label: 'Maintain',
    description: 'Stay at your current weight and keep your fitness level.',
    color: Colors.maintain,
  },
];

export default function GoalSelectionScreen() {
  const { draft, updateDraft } = useOnboardingStore();
  const [selected, setSelected] = useState<GoalType>(draft.goal ?? 'cut');

  function handleNext() {
    updateDraft({ goal: selected });
    router.push('/onboarding/weightGoal');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <OnboardingHeader step={4} total={6} title="What's your goal?" />
        <Text style={styles.subtitle}>This shapes your entire nutrition and training plan.</Text>

        {GOALS.map((g) => (
          <TouchableOpacity
            key={g.value}
            style={[styles.card, selected === g.value && { borderColor: g.color }]}
            onPress={() => setSelected(g.value)}
          >
            <Text style={styles.emoji}>{g.emoji}</Text>
            <View style={styles.cardBody}>
              <Text style={[styles.cardLabel, selected === g.value && { color: g.color }]}>{g.label}</Text>
              <Text style={styles.cardDesc}>{g.description}</Text>
            </View>
            {selected === g.value && (
              <View style={[styles.badge, { backgroundColor: g.color }]}>
                <Text style={styles.badgeTick}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.cta} onPress={handleNext}>
        <Text style={styles.ctaText}>Build My Plan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.xl },
  subtitle: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: Spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  emoji: { fontSize: 32 },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  cardDesc: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 18 },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeTick: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  cta: {
    margin: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
});
