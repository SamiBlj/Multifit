import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useRecommendationsStore } from '../../store/recommendationsStore';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { recommendMeals } from '../../services/recommendation/mealRecommender';
import { calcDailyTargets } from '../../services/recommendation/calorieCalculator';
import {
  saveProfile,
  saveWorkoutPlan,
  saveRecommendations,
  saveDailyTargets,
} from '../../services/supabase/database';
import { generateLocalWorkoutPlan } from '../../services/recommendation/workoutGenerator';

const STEPS = [
  'Saving your profile…',
  'Calculating your calorie targets…',
  'Matching meals to your goals…',
  'Building your workout programme…',
  'Almost ready…',
];

export default function GeneratingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [failed, setFailed]       = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const { draft, resetDraft }        = useOnboardingStore();
  const { setPlan }                  = useWorkoutStore();
  const { setRecommendations }       = useRecommendationsStore();
  const { setProfile }               = useUserStore();
  const user                         = useAuthStore((s) => s.user);

  const hasRun = useRef(false);

  // Wait for Firebase Auth to restore the session before running
  useEffect(() => {
    if (!user || hasRun.current) return;
    hasRun.current = true;

    const interval = setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, 1400);

    run();
    return () => clearInterval(interval);
  }, [user]);

  async function run() {
    try {
      const uid = user?.uid;
      if (!uid) throw new Error('Not authenticated');

      // 1. Build and save profile
      const fullProfile = {
        ...draft,
        id: uid,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      };
      await saveProfile(uid, fullProfile);
      setProfile(fullProfile as any);

      // 2. Calorie targets
      const targets = calcDailyTargets(fullProfile);
      await saveDailyTargets(uid, targets);

      // 3. Random-forest recommendations (always works, no API needed)
      const recs = recommendMeals(fullProfile);
      setRecommendations(recs);
      await saveRecommendations(uid, recs);

      // 4. Always generate a local workout plan first (offline, instant)
      const localPlan = generateLocalWorkoutPlan(fullProfile);
      setPlan(localPlan);
      await saveWorkoutPlan(uid, localPlan);

      resetDraft();
      router.replace('/(tabs)/home');
    } catch (err) {
      console.error('Onboarding failed:', err);
      setFailed(true);
    }
  }

  if (failed) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.hint}>Check your connection and try again.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setFailed(false); setStepIndex(0); run(); }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>MULTI</Text>
        <Text style={[styles.logoText, { color: Colors.primary }]}>FIT</Text>
      </View>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      <Text style={styles.stepText}>{STEPS[stepIndex]}</Text>
      <Text style={styles.hint}>
        {statusMsg || 'Your plan is being tailored to your exact goals, schedule, and dietary needs.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, backgroundColor: Colors.background },
  logoRow:    { flexDirection: 'row', marginBottom: Spacing.xxl },
  logoText:   { fontSize: 40, fontWeight: FontWeight.black, color: Colors.textPrimary, letterSpacing: 4 },
  spinner:    { marginBottom: Spacing.xl },
  stepText:   { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: FontWeight.medium, textAlign: 'center', marginBottom: Spacing.md },
  hint:       { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  errorTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.error, marginBottom: Spacing.sm },
  retryBtn:   { marginTop: Spacing.xl, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl },
  retryText:  { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
