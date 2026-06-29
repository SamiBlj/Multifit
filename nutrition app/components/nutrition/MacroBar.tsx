import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { DayPlan } from '../../types';

interface Props {
  dayPlan: DayPlan;
}

export function MacroBar({ dayPlan }: Props) {
  const total = dayPlan.totalProtein + dayPlan.totalCarbs + dayPlan.totalFat;
  const proteinPct = total > 0 ? dayPlan.totalProtein / total : 0;
  const carbsPct = total > 0 ? dayPlan.totalCarbs / total : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.calories}>{dayPlan.totalCalories} kcal</Text>
        <View style={styles.macroRow}>
          <Text style={[styles.macro, { color: Colors.accent }]}>P {dayPlan.totalProtein}g</Text>
          <Text style={[styles.macro, { color: Colors.bulk }]}>C {dayPlan.totalCarbs}g</Text>
          <Text style={[styles.macro, { color: Colors.cut }]}>F {dayPlan.totalFat}g</Text>
        </View>
      </View>
      {/* Stacked bar */}
      <View style={styles.bar}>
        <View style={[styles.barSegment, { flex: proteinPct, backgroundColor: Colors.accent }]} />
        <View style={[styles.barSegment, { flex: carbsPct, backgroundColor: Colors.bulk }]} />
        <View style={[styles.barSegment, { flex: 1 - proteinPct - carbsPct, backgroundColor: Colors.cut }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  calories: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  macroRow: { flexDirection: 'row', gap: Spacing.sm },
  macro: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  bar: { flexDirection: 'row', height: 6, borderRadius: Radius.full, overflow: 'hidden' },
  barSegment: { height: '100%' },
});
