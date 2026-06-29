/**
 * Onboarding Step 5 — 3-Month Target Weight
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';

export default function WeightGoalScreen() {
  const { draft, updateDraft } = useOnboardingStore();
  const [targetKg, setTargetKg] = useState(
    draft.targetWeightKg != null ? String(draft.targetWeightKg) : '',
  );
  const [skipped, setSkipped] = useState(false);

  const currentKg  = draft.weightKg ?? 70;
  const parsedTarget = parseFloat(targetKg);
  const valid        = !isNaN(parsedTarget) && parsedTarget > 30 && parsedTarget < 300;
  const diff         = valid ? parsedTarget - currentKg : 0;
  const kgPerMonth   = valid ? Math.abs(diff / 3).toFixed(1) : null;

  function getHint(): { text: string; color: string } | null {
    if (!valid) return null;
    if (diff > 0) return { text: `+${diff.toFixed(1)} kg — muscle gain (≈ ${kgPerMonth} kg/month)`, color: Colors.bulk ?? '#00C853' };
    if (diff < 0) return { text: `${diff.toFixed(1)} kg — fat loss (≈ ${kgPerMonth} kg/month)`, color: Colors.cut ?? '#FF4D4D' };
    return { text: 'Same as current — maintaining weight', color: Colors.textMuted };
  }

  function getCalorieTip(): string {
    if (!valid || diff === 0) return '';
    const kcalPerDay = Math.round(Math.abs(diff) * 7700 / 90);
    if (diff < 0) return `We'll reduce your daily calories by ~${kcalPerDay} kcal to hit this goal safely.`;
    return `We'll add ~${kcalPerDay} kcal/day to your plan to support this gain.`;
  }

  function handleContinue() {
    if (valid) {
      updateDraft({ targetWeightKg: parsedTarget });
    } else {
      updateDraft({ targetWeightKg: undefined });
    }
    router.push('/onboarding/generating');
  }

  const hint = getHint();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <OnboardingHeader step={5} total={6} title="Set your 3-month goal" />
          <Text style={styles.subtitle}>
            What do you want to weigh in 3 months? We'll calibrate your daily calories to get you there.
          </Text>

          {/* Current weight display */}
          <View style={styles.currentRow}>
            <View style={styles.currentBadge}>
              <Text style={styles.currentLabel}>Current weight</Text>
              <Text style={styles.currentValue}>{currentKg} kg</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} style={{ marginHorizontal: Spacing.md }} />
            <View style={[styles.currentBadge, styles.targetBadge, valid && { borderColor: Colors.primary }]}>
              <Text style={styles.currentLabel}>Target</Text>
              <Text style={[styles.currentValue, valid && { color: Colors.primary }]}>
                {valid ? `${parsedTarget} kg` : '?'}
              </Text>
            </View>
          </View>

          {/* Input */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="e.g. 75"
              placeholderTextColor={Colors.textMuted}
              value={targetKg}
              onChangeText={setTargetKg}
              maxLength={5}
            />
            <Text style={styles.inputUnit}>kg</Text>
          </View>

          {/* Feedback */}
          {hint && (
            <View style={[styles.hintBox, { borderColor: `${hint.color}50`, backgroundColor: `${hint.color}10` }]}>
              <Text style={[styles.hintText, { color: hint.color }]}>{hint.text}</Text>
              {getCalorieTip() !== '' && (
                <Text style={styles.calorieTip}>{getCalorieTip()}</Text>
              )}
            </View>
          )}

          {/* Info boxes */}
          <View style={styles.infoGrid}>
            {[
              { icon: 'flame-outline', label: 'Safe cut', value: '≤ 0.8 kg/week' },
              { icon: 'barbell-outline', label: 'Safe bulk', value: '≤ 0.5 kg/week' },
              { icon: 'calendar-outline', label: 'Timeframe', value: '12 weeks' },
            ].map(item => (
              <View key={item.label} style={styles.infoCard}>
                <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                <Text style={styles.infoValue}>{item.value}</Text>
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, !valid && styles.ctaDisabled]}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>
              {valid ? 'Set My Goal & Build Plan' : 'Enter a target weight above'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => { updateDraft({ targetWeightKg: undefined }); router.push('/onboarding/generating'); }}
          >
            <Text style={styles.skipText}>Skip — use goal defaults</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: Colors.background },
  scroll:   { flexGrow: 1, paddingBottom: Spacing.xl },
  content:  { flex: 1, padding: Spacing.xl },
  subtitle: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: Spacing.xl, lineHeight: 22 },

  currentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl, justifyContent: 'center' },
  currentBadge: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center',
  },
  targetBadge: { borderColor: Colors.border },
  currentLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  currentValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.primary,
    marginBottom: Spacing.lg, paddingHorizontal: Spacing.lg,
  },
  input: { flex: 1, fontSize: 36, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingVertical: Spacing.md },
  inputUnit: { fontSize: FontSize.lg, color: Colors.textMuted, fontWeight: FontWeight.medium },

  hintBox: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.lg, gap: 4 },
  hintText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  calorieTip: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },

  infoGrid: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  infoCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center', gap: 4,
  },
  infoValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textMuted },

  footer:     { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  cta: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  skipBtn:    { alignItems: 'center', paddingVertical: Spacing.sm },
  skipText:   { fontSize: FontSize.sm, color: Colors.textMuted, textDecorationLine: 'underline' },
});
