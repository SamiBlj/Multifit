/**
 * Onboarding Step 4 — Allergies & intolerances
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';

const COMMON_ALLERGENS = [
  'Gluten', 'Dairy', 'Eggs', 'Tree Nuts', 'Peanuts',
  'Soy', 'Fish', 'Shellfish', 'Sesame',
];

const COMMON_INTOLERANCES = [
  'Lactose', 'Fructose', 'Histamine', 'FODMAPs', 'Caffeine',
];

export default function AllergiesScreen() {
  const { draft, updateDraft } = useOnboardingStore();
  const [allergies, setAllergies] = useState<string[]>(draft.allergies ?? []);
  const [intolerances, setIntolerances] = useState<string[]>(draft.intolerances ?? []);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function handleNext() {
    updateDraft({ allergies, intolerances });
    router.push('/onboarding/goalSelection');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OnboardingHeader step={3} total={6} title="Any allergies or intolerances?" />
      <Text style={styles.subtitle}>These will never appear in your meal plan.</Text>

      <Text style={styles.sectionTitle}>Allergies</Text>
      <View style={styles.chipGrid}>
        {COMMON_ALLERGENS.map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.chip, allergies.includes(a) && styles.chipActive]}
            onPress={() => toggle(allergies, setAllergies, a)}
          >
            <Text style={[styles.chipText, allergies.includes(a) && styles.chipTextActive]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Intolerances</Text>
      <View style={styles.chipGrid}>
        {COMMON_INTOLERANCES.map((i) => (
          <TouchableOpacity
            key={i}
            style={[styles.chip, intolerances.includes(i) && styles.chipActive]}
            onPress={() => toggle(intolerances, setIntolerances, i)}
          >
            <Text style={[styles.chipText, intolerances.includes(i) && styles.chipTextActive]}>{i}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.cta} onPress={handleNext}>
        <Text style={styles.ctaText}>{allergies.length + intolerances.length > 0 ? 'Continue' : 'None — Continue'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  subtitle: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.error, backgroundColor: `${Colors.error}22` },
  chipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  chipTextActive: { color: Colors.error, fontWeight: FontWeight.medium },
  cta: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
});
