import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { Meal } from '../../types';

const MEAL_TYPE_LABEL: Record<Meal['type'], string> = {
  breakfast: '🌅 Breakfast',
  lunch: '☀️ Lunch',
  dinner: '🌙 Dinner',
  snack: '🍎 Snack',
};

interface Props {
  meal: Meal;
  compact?: boolean;
  onPress?: () => void;
}

export function MealCard({ meal, compact = false, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.card, compact && styles.cardCompact]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.top}>
        <Text style={styles.typeLabel}>{MEAL_TYPE_LABEL[meal.type]}</Text>
        <Text style={styles.calories}>{meal.calories} kcal</Text>
      </View>
      <Text style={styles.name}>{meal.name}</Text>
      {!compact && <Text style={styles.description} numberOfLines={2}>{meal.description}</Text>}
      <View style={styles.macros}>
        <MacroPill label="P" value={meal.protein} color={Colors.accent} />
        <MacroPill label="C" value={meal.carbs} color={Colors.bulk} />
        <MacroPill label="F" value={meal.fat} color={Colors.cut} />
        <Text style={styles.prepTime}>⏱ {meal.prepTimeMinutes} min</Text>
      </View>
    </TouchableOpacity>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.pillText, { color }]}>{label}: {value}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardCompact: { padding: Spacing.sm, marginBottom: Spacing.sm },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  typeLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  calories: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  name: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  macros: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  pill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  pillText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  prepTime: { fontSize: FontSize.xs, color: Colors.textMuted, marginLeft: 'auto' },
});
