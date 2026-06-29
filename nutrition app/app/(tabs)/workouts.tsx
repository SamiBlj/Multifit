import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useWorkoutStore } from '../../store/workoutStore';
import { useUserStore } from '../../store/userStore';
import { GOAL_META } from '../../constants/goalMeta';

// ─── Muscle group colour map ──────────────────────────────────────────────────
const MUSCLE_COLORS: Record<string, string> = {
  chest: '#FF6B35', back: '#00E5FF', shoulders: '#FFB800', legs: '#7C4DFF',
  arms: '#00C853', core: '#FF4D4D', biceps: '#00C853', triceps: '#FF6B35',
  glutes: '#FFB800', hamstrings: '#7C4DFF', quads: '#FF4D4D', calves: '#00E5FF',
  'upper back': '#00E5FF', 'lower back': '#00B0CC', abs: '#FF4D4D',
  'hip flexors': '#A78BFA', forearms: '#FFB800',
};
function muscleCol(m: string) { return MUSCLE_COLORS[m.toLowerCase()] ?? Colors.primary; }


export default function WorkoutsScreen() {
  const { plan }    = useWorkoutStore();
  const { profile } = useUserStore();

  const goalMeta = GOAL_META[profile?.goal ?? 'maintain'];
  const todayIdx = (new Date().getDay() - 1 + 7) % 7;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Workouts</Text>
            {plan && <Text style={styles.subtitle}>{plan.days.length} sessions · {plan.weeksTotal} weeks</Text>}
          </View>
          {plan && (
            <View style={[styles.goalChip, { backgroundColor: `${goalMeta.color}18`, borderColor: `${goalMeta.color}55` }]}>
              <Text style={styles.goalEmoji}>{goalMeta.emoji}</Text>
              <Text style={[styles.goalText, { color: goalMeta.color }]}>{goalMeta.label}</Text>
            </View>
          )}
        </View>

        {/* ── Stats bar ──────────────────────────────────────────────────── */}
        {plan && (
          <View style={styles.statsBar}>
            {[
              { icon: 'calendar-outline' as const, label: 'Days/week',   value: String(plan.days.length) },
              { icon: 'time-outline'     as const, label: 'Avg. duration', value: `${Math.round(plan.days.reduce((a,d)=>a+d.durationMinutes,0)/plan.days.length)}m` },
              { icon: 'trophy-outline'   as const, label: 'Programme',   value: `${plan.weeksTotal}wk` },
            ].map(s => (
              <View key={s.label} style={styles.statItem}>
                <Ionicons name={s.icon} size={20} color={Colors.primary} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Day cards ──────────────────────────────────────────────────── */}
        {plan ? plan.days.map((day, index) => {
          const isToday       = index === todayIdx;
          const col           = goalMeta.color;
          const uniqueMuscles = Array.from(new Set(day.exercises.flatMap(e => e.muscleGroups)));

          return (
            <TouchableOpacity
              key={index}
              style={[styles.dayCard, isToday && { borderColor: col, borderWidth: 2 }]}
              onPress={() => router.push(`/workout/${index}` as any)}
              activeOpacity={0.85}
            >
              {isToday && <View style={[styles.todayBar, { backgroundColor: col }]} />}

              <View style={styles.dayCardHeader}>
                <View style={[styles.dayNumBubble, { backgroundColor: isToday ? col : Colors.surfaceElevated }]}>
                  <Text style={[styles.dayNumText, isToday && { color: Colors.white }]}>{index + 1}</Text>
                </View>

                <View style={styles.dayMeta}>
                  {isToday && <Text style={[styles.todayTag, { color: col }]}>TODAY</Text>}
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                  <Text style={styles.dayFocus}>{day.focus}</Text>
                </View>

                <View style={styles.dayRight}>
                  <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={11} color={Colors.primary} />
                    <Text style={styles.durationText}>{day.durationMinutes}m</Text>
                  </View>
                  <Ionicons name="chevron-forward-circle" size={24} color={Colors.border} />
                </View>
              </View>

              {/* Muscle chips preview */}
              <View style={styles.musclePreview}>
                {uniqueMuscles.slice(0, 5).map(m => (
                  <View key={m} style={[styles.muscleChip, { backgroundColor: `${muscleCol(m)}18` }]}>
                    <Text style={[styles.muscleChipText, { color: muscleCol(m) }]}>{m}</Text>
                  </View>
                ))}
                <Text style={styles.exCountText}>{day.exercises.length} exercises</Text>
              </View>
            </TouchableOpacity>
          );
        }) : (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyTitle}>No programme yet</Text>
            <Text style={styles.emptyText}>Complete onboarding to generate your personalised workout plan.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: Colors.background },
  scroll:           { padding: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 80 },

  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  title:            { fontSize: FontSize.xxl, fontWeight: FontWeight.black, color: Colors.textPrimary },
  subtitle:         { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 3 },
  goalChip:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  goalEmoji:        { fontSize: 16 },
  goalText:         { fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  statsBar:         { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl, overflow: 'hidden' },
  statItem:         { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 3 },
  statValue:        { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.textPrimary },
  statLabel:        { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },

  dayCard:          { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden' },
  todayBar:         { height: 3 },
  dayCardHeader:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  dayNumBubble:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dayNumText:       { fontSize: FontSize.lg, fontWeight: FontWeight.black, color: Colors.textMuted },
  dayMeta:          { flex: 1 },
  todayTag:         { fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  dayLabel:         { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  dayFocus:         { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  dayRight:         { alignItems: 'flex-end', gap: Spacing.sm },
  durationBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${Colors.primary}18`, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  durationText:     { fontSize: 10, color: Colors.primary, fontWeight: FontWeight.bold },

  musclePreview:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  muscleChip:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  muscleChipText:   { fontSize: 10, fontWeight: FontWeight.semibold, textTransform: 'capitalize' },
  exCountText:      { fontSize: 10, color: Colors.textMuted, marginLeft: 'auto' },


  empty:            { alignItems: 'center', marginTop: 80, gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyEmoji:       { fontSize: 64 },
  emptyTitle:       { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  emptyText:        { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
