import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useWorkoutStore } from '../store/workoutStore';
import { useRecommendationsStore } from '../store/recommendationsStore';
import { subscribeToAuthState } from '../services/supabase/auth';
import { getRecommendations, saveWorkoutPlan } from '../services/supabase/database';
import { recommendMeals } from '../services/recommendation/mealRecommender';
import { generateLocalWorkoutPlan } from '../services/recommendation/workoutGenerator';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { loadProfile }        = useUserStore();
  const { loadCalendar }       = useNutritionStore();
  const { loadPlan }           = useWorkoutStore();
  const { setRecommendations } = useRecommendationsStore();

  useEffect(() => {
    // Safety net: if Supabase hasn't responded in 8 seconds, go to login
    const fallback = setTimeout(() => {
      SplashScreen.hideAsync();
      router.replace('/auth/login');
    }, 8000);

    const unsubscribe = subscribeToAuthState(async (appUser) => {
      clearTimeout(fallback);

      useAuthStore.setState({
        user:            appUser,
        isAuthenticated: !!appUser,
        isLoading:       false,
      });

      if (appUser) {
        try {
          await loadProfile(appUser.uid);
          await Promise.all([
            loadCalendar(appUser.uid),
            loadPlan(appUser.uid),
          ]);

          // If no workout plan exists yet, generate one locally and save it
          if (!useWorkoutStore.getState().plan) {
            const profile = useUserStore.getState().profile;
            if (profile?.onboardingComplete) {
              const localPlan = generateLocalWorkoutPlan(profile);
              useWorkoutStore.getState().setPlan(localPlan);
              saveWorkoutPlan(appUser.uid, localPlan).catch(() => {});
            }
          }

          const storedRecs = await getRecommendations(appUser.uid);
          if (storedRecs) {
            setRecommendations(storedRecs as any);
          } else {
            const profile = useUserStore.getState().profile;
            if (profile) setRecommendations(recommendMeals(profile));
          }
        } catch (e) {
          console.warn('Data load error:', e);
        }

        SplashScreen.hideAsync();
        const profile = useUserStore.getState().profile;
        if (!profile?.onboardingComplete) {
          router.replace('/onboarding');
        } else if (!(profile as any)?.isPremium) {
          router.replace('/paywall');
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        SplashScreen.hideAsync();
        router.replace('/auth/login');
      }
    });

    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="paywall" />
        <Stack.Screen name="meal/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="workout/[dayIndex]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}
