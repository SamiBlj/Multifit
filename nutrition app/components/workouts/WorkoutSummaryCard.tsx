import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { WorkoutDay } from '../../types';

interface Props {
  workout: WorkoutDay;
  onPress?: () => void;
}

export function WorkoutSummaryCard({ workout, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.left}>
        <Text style={styles.label}>{workout.dayLabel}</Text>
        <Text style={styles.focus}>{workout.focus}</Text>
        <Text style={styles.meta}>{workout.exercises.length} exercises · {workout.durationMinutes} min</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>View →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  left: { flex: 1 },
  label: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  focus: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 2, fontWeight: FontWeight.medium },
  meta: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  cta: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: `${Colors.primary}22`,
    borderRadius: Radius.md,
  },
  ctaText: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
});
