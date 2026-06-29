/**
 * Onboarding Step 2 — Basic physical stats
 * Collects: name, age, sex, height (cm), weight (kg), activity level
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { Sex, ActivityLevel } from '../../types';

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const ACTIVITY_OPTIONS: { label: string; sublabel: string; value: ActivityLevel }[] = [
  { label: 'Sedentary', sublabel: 'Little or no exercise', value: 'sedentary' },
  { label: 'Lightly Active', sublabel: '1–3 days/week', value: 'lightlyActive' },
  { label: 'Moderately Active', sublabel: '3–5 days/week', value: 'moderatelyActive' },
  { label: 'Very Active', sublabel: '6–7 days/week', value: 'veryActive' },
  { label: 'Extra Active', sublabel: 'Physical job + training', value: 'extraActive' },
];

export default function BasicStatsScreen() {
  const { draft, updateDraft } = useOnboardingStore();

  const [name, setName] = useState(draft.name ?? '');
  const [age, setAge] = useState(draft.age?.toString() ?? '');
  const [sex, setSex] = useState<Sex>(draft.sex ?? 'male');
  const [height, setHeight] = useState(draft.heightCm?.toString() ?? '');
  const [weight, setWeight] = useState(draft.weightKg?.toString() ?? '');
  const [activity, setActivity] = useState<ActivityLevel>(draft.activityLevel ?? 'moderatelyActive');

  function handleNext() {
    updateDraft({
      name,
      age: Number(age),
      sex,
      heightCm: Number(height),
      weightKg: Number(weight),
      activityLevel: activity,
    });
    router.push('/onboarding/cookingTime');
  }

  const isValid = name && age && height && weight;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <OnboardingHeader step={1} total={6} title="Tell us about yourself" />

      {/* Name */}
      <Text style={styles.label}>Your name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Alex"
        placeholderTextColor={Colors.textMuted}
      />

      {/* Age / Height / Weight row */}
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Age</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="25" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="175" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="75" placeholderTextColor={Colors.textMuted} />
        </View>
      </View>

      {/* Sex */}
      <Text style={styles.label}>Sex</Text>
      <View style={styles.chipRow}>
        {SEX_OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.value}
            style={[styles.chip, sex === o.value && styles.chipActive]}
            onPress={() => setSex(o.value)}
          >
            <Text style={[styles.chipText, sex === o.value && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Activity level */}
      <Text style={styles.label}>Activity level</Text>
      {ACTIVITY_OPTIONS.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[styles.activityCard, activity === o.value && styles.activityCardActive]}
          onPress={() => setActivity(o.value)}
        >
          <Text style={[styles.activityLabel, activity === o.value && { color: Colors.primary }]}>{o.label}</Text>
          <Text style={styles.activitySub}>{o.sublabel}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={[styles.cta, !isValid && styles.ctaDisabled]} onPress={handleNext} disabled={!isValid}>
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md, fontWeight: FontWeight.medium },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  rowItem: { flex: 1 },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}22` },
  chipText: { color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.primary },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  activityCardActive: { borderColor: Colors.primary },
  activityLabel: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  activitySub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  cta: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
});
