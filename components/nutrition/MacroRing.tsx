/**
 * Circular macro summary — placeholder using View arcs.
 * Replace inner circle with react-native-svg arc in production.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/theme';
import { DayPlan } from '../../types';

interface Props {
  dayPlan: DayPlan;
}

export function MacroRing({ dayPlan }: Props) {
  return (
    <View style={styles.container}>
      {/* Ring placeholder */}
      <View style={styles.ring}>
        <View style={styles.innerCircle}>
          <Text style={styles.calValue}>{dayPlan.totalCalories}</Text>
          <Text style={styles.calLabel}>kcal</Text>
        </View>
      </View>

      {/* Macro legend */}
      <View style={styles.legend}>
        <MacroLegendItem label="Protein" value={dayPlan.totalProtein} color={Colors.accent} />
        <MacroLegendItem label="Carbs" value={dayPlan.totalCarbs} color={Colors.bulk} />
        <MacroLegendItem label="Fat" value={dayPlan.totalFat} color={Colors.cut} />
      </View>
    </View>
  );
}

function MacroLegendItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View>
        <Text style={styles.legendValue}>{value}g</Text>
        <Text style={styles.legendLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 10,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: { alignItems: 'center' },
  calValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  calLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  legend: { flex: 1, gap: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  legendLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
});
