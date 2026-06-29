/**
 * Onboarding Step 3 — Cooking time availability
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';

const TIME_OPTIONS = [
  { label: '< 15 min', sublabel: 'Grab-and-go meals only', minutes: 15 },
  { label: '15 – 30 min', sublabel: 'Quick preps, minimal cooking', minutes: 30 },
  { label: '30 – 45 min', sublabel: 'Standard weeknight meals', minutes: 45 },
  { label: '45 – 60 min', sublabel: 'More elaborate cooking', minutes: 60 },
  { label: '60+ min', sublabel: 'I enjoy cooking and have time', minutes: 90 },
];

export default function CookingTimeScreen() {
  const { draft, updateDraft } = useOnboardingStore();
  const [selected, setSelected] = useState<number>(draft.cookingTimeMinutes ?? 30);

  function handleNext() {
    updateDraft({ cookingTimeMinutes: selected });
    router.push('/onboarding/allergies');
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <OnboardingHeader step={2} total={6} title="How much time do you have to cook?" />
        <Text style={styles.subtitle}>We'll only give you meals that fit your schedule.</Text>

        {TIME_OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.minutes}
            style={[styles.card, selected === o.minutes && styles.cardActive]}
            onPress={() => setSelected(o.minutes)}
          >
            <View style={[styles.radio, selected === o.minutes && styles.radioActive]}>
              {selected === o.minutes && <View style={styles.radioDot} />}
            </View>
            <View>
              <Text style={[styles.cardLabel, selected === o.minutes && { color: Colors.primary }]}>{o.label}</Text>
              <Text style={styles.cardSub}>{o.sublabel}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.cta} onPress={handleNext}>
        <Text style={styles.ctaText}>Continue</Text>
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
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardActive: { borderColor: Colors.primary },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  cardLabel: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  cardSub: { fontSize: FontSize.sm, color: Colors.textMuted },
  cta: {
    margin: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
});
