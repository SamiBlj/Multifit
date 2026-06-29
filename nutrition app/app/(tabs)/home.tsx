import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useRecommendationsStore } from '../../store/recommendationsStore';
import { GOAL_META } from '../../constants/goalMeta';
import { calcDailyTargets } from '../../services/recommendation/calorieCalculator';
import { recommendMeals } from '../../services/recommendation/mealRecommender';

const { width } = Dimensions.get('window');

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Up late',      sub: 'Rest is part of the plan.' };
  if (h < 12) return { text: 'Good morning', sub: 'Let\'s make today count.' };
  if (h < 17) return { text: 'Good afternoon', sub: 'Keep the momentum going.' };
  if (h < 21) return { text: 'Good evening', sub: 'Evening sessions hit different.' };
  return       { text: 'Good night',    sub: 'Recover well. Grow overnight.' };
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
};

const GOAL_BG: Record<string, string[]> = {
  cut:          ['#FF6B3520', '#FF4D4D10'],
  bulk:         ['#00C85320', '#00E5FF10'],
  muscleGrowth: ['#FFB80020', '#FF6B3510'],
  maintain:     ['#7C4DFF20', '#00E5FF10'],
};

export default function HomeScreen() {
  const { profile }         = useUserStore();
  const { user }            = useAuthStore();
  const { getTodaysPlan }   = useNutritionStore();
  const { plan }            = useWorkoutStore();
  const { recommendations } = useRecommendationsStore();

  const displayName   = profile?.name ?? user?.name ?? 'Athlete';
  const firstName     = displayName.split(' ')[0];
  const today         = getTodaysPlan();
  const goalMeta      = GOAL_META[profile?.goal ?? 'maintain'];
  const greet         = greeting();

  // Always derive exact targets from profile so numbers are always personalised
  const targets = profile ? calcDailyTargets(profile) : null;

  const todayIdx      = (new Date().getDay() - 1 + 7) % 7;
  const todaysWorkout = plan?.days[todayIdx % (plan.days.length || 1)] ?? null;
  const liveRecs      = recommendations ?? (profile ? recommendMeals(profile) : null);

  // Weight-goal progress
  const hasWeightGoal  = profile?.targetWeightKg != null && profile?.weightKg != null;
  const weightDiff     = hasWeightGoal ? (profile!.targetWeightKg! - profile!.weightKg) : 0;
  const isLosingWeight = weightDiff < 0;
  const goalKg         = Math.abs(weightDiff).toFixed(1);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.dateLabel}>{formatDate()}</Text>
            <Text style={styles.greetText}>{greet.text},</Text>
            <Text style={styles.nameText}>{firstName}</Text>
            <Text style={styles.subText}>{greet.sub}</Text>
          </View>
          <View style={[styles.goalOrb, { borderColor: `${goalMeta.color}55` }]}>
            <Text style={styles.goalOrbEmoji}>{goalMeta.emoji}</Text>
            <Text style={[styles.goalOrbLabel, { color: goalMeta.color }]}>{goalMeta.label}</Text>
          </View>
        </View>

        {/* ── Daily Fuel Card ───────────────────────────────────────────────── */}
        {targets && (
          <View style={[styles.fuelCard, { borderColor: `${goalMeta.color}30` }]}>
            {/* Accent gradient stripe */}
            <View style={[styles.fuelStripe, { backgroundColor: goalMeta.color }]} />

            <View style={styles.fuelInner}>
              {/* Big calorie number */}
              <View style={styles.fuelCalWrap}>
                <Text style={[styles.fuelCalNumber, { color: goalMeta.color }]}>
                  {targets.calories.toLocaleString()}
                </Text>
                <Text style={styles.fuelCalUnit}>kcal / day</Text>
                <Text style={styles.fuelCalSub}>your exact daily target</Text>
              </View>

              {/* Divider */}
              <View style={styles.fuelDivider} />

              {/* Macro pills */}
              <View style={styles.macroPills}>
                <MacroPill label="Protein" value={targets.proteinG} unit="g" color="#00C853" icon="💪" />
                <MacroPill label="Carbs"   value={targets.carbsG}   unit="g" color={Colors.bulk}   icon="⚡" />
                <MacroPill label="Fat"     value={targets.fatG}     unit="g" color="#A78BFA" icon="🥑" />
              </View>
            </View>
          </View>
        )}

        {/* ── 3-Month Goal Banner ───────────────────────────────────────────── */}
        {hasWeightGoal && (
          <View style={[styles.goalBanner, { borderColor: `${goalMeta.color}30`, backgroundColor: `${goalMeta.color}08` }]}>
            <Text style={styles.goalBannerEmoji}>{isLosingWeight ? '🔥' : '📈'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalBannerTitle}>
                {isLosingWeight ? `Lose ${goalKg} kg` : `Gain ${goalKg} kg`} in 3 months
              </Text>
              <Text style={styles.goalBannerSub}>
                Your calories are calibrated to hit {profile!.targetWeightKg} kg by{' '}
                {new Date(Date.now() + 90 * 86400000).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </View>
        )}

        {/* ── Today's Workout ───────────────────────────────────────────────── */}
        {todaysWorkout && (
          <View style={styles.section}>
            <SectionTitle title="Today's Session" />
            <TouchableOpacity
              style={[styles.workoutCard, { borderColor: `${goalMeta.color}40` }]}
              onPress={() => router.push('/(tabs)/workouts')}
              activeOpacity={0.85}
            >
              <View style={[styles.workoutAccent, { backgroundColor: goalMeta.color }]} />
              <View style={styles.workoutCardBody}>
                <View style={[styles.workoutIconCircle, { backgroundColor: `${goalMeta.color}18` }]}>
                  <Ionicons name="barbell" size={26} color={goalMeta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workoutFocus}>{todaysWorkout.focus}</Text>
                  <Text style={styles.workoutLabel}>{todaysWorkout.dayLabel}</Text>
                  <View style={styles.workoutMeta}>
                    <WorkoutPill icon="time-outline" label={`${todaysWorkout.durationMinutes} min`} />
                    <WorkoutPill icon="fitness-outline" label={`${todaysWorkout.exercises.length} exercises`} />
                  </View>
                </View>
                <View style={[styles.playBtn, { backgroundColor: goalMeta.color }]}>
                  <Ionicons name="play" size={18} color={Colors.white} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Today's Meals ─────────────────────────────────────────────────── */}
        {(today || liveRecs) && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <SectionTitle title={today ? "Today's Meals" : "Suggested For You"} />
              <TouchableOpacity onPress={() => router.push('/(tabs)/nutrition')} style={styles.seeAll}>
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealScroll}
            >
              {(today
                ? today.meals
                : [liveRecs!.breakfast[0], liveRecs!.lunch[0], liveRecs!.dinner[0], liveRecs!.snack?.[0]].filter(Boolean) as any[]
              ).map((meal: any) => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.mealCard}
                  onPress={() => router.push(`/meal/${meal.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.mealEmojiWrap}>
                    <Text style={styles.mealEmoji}>{MEAL_ICONS[meal.type] ?? '🍽️'}</Text>
                  </View>
                  <View style={[styles.mealBadge, { backgroundColor: `${Colors.primary}18` }]}>
                    <Text style={[styles.mealBadgeText, { color: Colors.primary }]}>{meal.type}</Text>
                  </View>
                  <Text style={styles.mealName} numberOfLines={2}>{meal.name}</Text>
                  <View style={styles.mealFooter}>
                    <Ionicons name="flame" size={11} color={Colors.primary} />
                    <Text style={styles.mealKcal}>{meal.calories} kcal</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Nav Pills ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.navGrid}>
            <NavTile icon="restaurant" label="Nutrition" color={Colors.primary}   route="/(tabs)/nutrition" />
            <NavTile icon="barbell"    label="Workouts"  color={Colors.accent}    route="/(tabs)/workouts"  />
            <NavTile icon="person"     label="Profile"   color={Colors.bulk}      route="/(tabs)/profile"   />
            <NavTile icon="settings"   label="Settings"  color="#A78BFA"          route="/settings"         />
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MacroPill({ label, value, unit, color, icon }: {
  label: string; value: number; unit: string; color: string; icon: string;
}) {
  return (
    <View style={[pillStyles.wrap, { backgroundColor: `${color}12`, borderColor: `${color}25` }]}>
      <Text style={pillStyles.icon}>{icon}</Text>
      <Text style={[pillStyles.value, { color }]}>{value}<Text style={pillStyles.unit}>{unit}</Text></Text>
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}

function WorkoutPill({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={wpStyles.pill}>
      <Ionicons name={icon} size={11} color={Colors.textMuted} />
      <Text style={wpStyles.label}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function NavTile({ icon, label, color, route }: { icon: any; label: string; color: string; route: string }) {
  return (
    <TouchableOpacity
      style={[navStyles.tile, { borderColor: `${color}25` }]}
      onPress={() => router.push(route as any)}
      activeOpacity={0.8}
    >
      <View style={[navStyles.iconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={navStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 100 },

  // Header
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, marginBottom: Spacing.xl },
  headerLeft:   { flex: 1 },
  dateLabel:    { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  greetText:    { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  nameText:     { fontSize: 36, fontWeight: FontWeight.black, color: Colors.textPrimary, letterSpacing: -0.5, marginTop: 2 },
  subText:      { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  goalOrb:      { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.surface, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.md, gap: 2 },
  goalOrbEmoji: { fontSize: 22 },
  goalOrbLabel: { fontSize: 9, fontWeight: FontWeight.black, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Daily Fuel card
  fuelCard:     { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  fuelStripe:   { height: 4, width: '100%' },
  fuelInner:    { padding: Spacing.lg },
  fuelCalWrap:  { alignItems: 'center', paddingVertical: Spacing.md },
  fuelCalNumber:{ fontSize: 64, fontWeight: FontWeight.black, letterSpacing: -2, lineHeight: 68 },
  fuelCalUnit:  { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium, marginTop: 2 },
  fuelCalSub:   { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4, letterSpacing: 0.3 },
  fuelDivider:  { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  macroPills:   { flexDirection: 'row', justifyContent: 'space-around' },

  // Goal banner
  goalBanner:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  goalBannerEmoji:{ fontSize: 24 },
  goalBannerTitle:{ fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  goalBannerSub:  { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },

  // Sections
  section:      { marginBottom: Spacing.lg, paddingHorizontal: Spacing.xl },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  seeAll:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText:   { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },

  // Workout card
  workoutCard:     { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  workoutAccent:   { height: 3 },
  workoutCardBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  workoutIconCircle:{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  workoutFocus:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  workoutLabel:    { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutMeta:     { flexDirection: 'row', gap: Spacing.sm },
  playBtn:         { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  // Meal scroll
  mealScroll: { paddingRight: Spacing.xl },
  mealCard:   { width: 148, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginRight: Spacing.sm },
  mealEmojiWrap:{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  mealEmoji:  { fontSize: 26 },
  mealBadge:  { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, marginBottom: 6 },
  mealBadgeText:{ fontSize: 10, fontWeight: FontWeight.bold, textTransform: 'capitalize' },
  mealName:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 18, marginBottom: 10, flex: 1 },
  mealFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mealKcal:   { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },

  // Nav grid
  navGrid:    { flexDirection: 'row', gap: Spacing.sm },
});

const pillStyles = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, paddingVertical: Spacing.sm, gap: 2 },
  icon:  { fontSize: 16, marginBottom: 2 },
  value: { fontSize: FontSize.md, fontWeight: FontWeight.black },
  unit:  { fontSize: 10, fontWeight: FontWeight.medium },
  label: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
});

const wpStyles = StyleSheet.create({
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: FontSize.xs, color: Colors.textMuted },
});

const navStyles = StyleSheet.create({
  tile:     { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.sm },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label:    { fontSize: 10, color: Colors.textSecondary, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
});
